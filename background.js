// ── Gobble Background Service Worker ────────────────────────────────
// Handles messaging between popup, content script, and storage.
// Download logic lives in popup.js (service workers lack document/Blob).

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_PREFS') {
    chrome.storage.local.set({ gobble_prefs: message.payload }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'LOAD_PREFS') {
    chrome.storage.local.get(['gobble_prefs'], (result) => {
      sendResponse(result.gobble_prefs || {});
    });
    return true;
  }

  sendResponse({ ok: false });
  return false;
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  });
});
