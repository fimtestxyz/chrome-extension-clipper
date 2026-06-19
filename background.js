// ── Gobble Background Service Worker ────────────────────────────────
// Handles messaging between popup, content script, and storage.
// Also manages backend API forwarding and offline retry queue.

import QueueManager from './queue-manager.js';

// ── State tracking ──────────────────────────────────────────────────

// Existing: popup message handlers store/retrieve prefs
// These are handled via chrome.storage.local directly in the handlers below.

// ── Helper: Get active backend profile ───────────────────────────────

async function getActiveProfile() {
  const result = await chrome.storage.local.get(['gobble_backend_profiles']);
  const profiles = result.gobble_backend_profiles || [];
  return profiles.find((p) => p.enabled && p.default) || profiles[0] || null;
}

// ── API Forwarding ───────────────────────────────────────────────────

async function forwardToApi(payload) {
  const profile = await getActiveProfile();
  if (!profile) {
    console.warn('[Gobble] No backend profile configured, queuing for retry');
    await QueueManager.enqueue(payload);
    return { success: false, reason: 'no-profile' };
  }

  let baseUrl = (profile.baseUrl || 'http://localhost:6666').replace(/\/$/, '');
  let endpoint = (profile.endpoint || '/capture') || '/capture';
  if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
  endpoint = endpoint.replace(/\/$/, '');

  const url = baseUrl + endpoint;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    console.log('[Gobble] Successfully forwarded capture to backend');
    return { success: true, reason: null };
  } catch (e) {
    console.warn('[Gobble] API forward failed, queuing for retry:', e.message);
    await QueueManager.enqueue(payload);
    return { success: false, reason: e.message };
  }
}

// ── Capture message handler ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Existing: SAVE_PREFS handler
  if (message.type === 'SAVE_PREFS') {
    chrome.storage.local.set({ gobble_prefs: message.payload }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  // Existing: LOAD_PREFS handler
  if (message.type === 'LOAD_PREFS') {
    chrome.storage.local.get(['gobble_prefs'], (result) => {
      sendResponse(result.gobble_prefs || {});
    });
    return true;
  }

  // New: Handle capture requests from content script
  if (message.type === 'GOBBLE_CAPTURE') {
    const { extraction, tabInfo } = message.payload;

    const payload = {
      timestamp: Date.now(),
      tab: {
        id: tabInfo?.id || 0,
        title: tabInfo?.title || 'Unknown',
        url: tabInfo?.url || '',
      },
      content: {
        raw: extraction?.content || '',
        format: 'json',
      },
      metadata: {
        extractedAt: new Date().toISOString(),
        extractorVersion: '1.0.0',
      },
    };

    forwardToApi(payload).then((result) => {
      // Send status update back to content script
      if (tabInfo?.id) {
        chrome.tabs.sendMessage(tabInfo.id, {
          type: 'GOBBLE_CAPTURE_STATUS',
          status: result.success ? 'sent' : 'failed',
        }).catch(() => { /* tab may have navigated */ });
      }
    });

    sendResponse({ ok: true, sent: true });
    return false;
  }

  sendResponse({ ok: false });
  return false;
});

// ── Periodic Queue Flush ─────────────────────────────────────────────

setInterval(async () => {
  const queue = await QueueManager.getQueue();
  if (queue.length === 0) return;

  const now = Date.now();
  const readyToRetry = queue.filter((item) => item.nextRetry <= now);

  for (const item of readyToRetry) {
    try {
      const result = await forwardToApi(item.payload);
      if (result.success) {
        // Remove from queue on success
        const updated = await QueueManager.getQueue();
        const idx = updated.findIndex((i) => i.id === item.id);
        if (idx !== -1) {
          updated.splice(idx, 1);
          await chrome.storage.local.set({ gobble_capture_queue: updated });
        }
      } else {
        await QueueManager.markFailed(item.id);
      }
    } catch (e) {
      await QueueManager.markFailed(item.id);
    }
  }
}, 30000);

// ── Action clicked (popup open via shortcut) ─────────────────────────

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  });
});

console.log('[Gobble] Background Service Worker Initialized');
