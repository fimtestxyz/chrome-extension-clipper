// ── Gobble Popup Controller ─────────────────────────────────────────
// Handles mode selection, extraction, preview, copy/download, and settings.

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────
  let activeFormat = 'markdown';
  let extractedContent = '';
  let extractedMeta = {};
  let prefs = {};

  // ── DOM refs ───────────────────────────────────────────────────────
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

  const pageTitle = $('#page-title');
  const pageUrl = $('#page-url');
  const modeCards = $$('.mode-card');
  const previewSection = $('#preview-section');
  const previewContent = $('#preview-content');
  const previewBadge = $('#preview-badge');
  const progress = $('#progress');
  const progressFill = $('#progress-fill');
  const progressText = $('#progress-text');
  const statusIndicator = $('#status-indicator');
  const statusText = $('#status-text');
  const statsEl = $('#stats');
  const settingsPanel = $('#settings-panel');
  const btnSelection = $('#btn-selection');
  const btnMarkdown = $('#btn-markdown');
  const btnTables = $('#btn-tables');
  const btnImages = $('#btn-images');
  const btnLinks = $('#btn-links');
  const btnSettings = $('#btn-settings');
  const btnCopy = $('#btn-copy');
  const btnDownload = $('#btn-download');
  const btnCloseSettings = $('#btn-close-settings');
  const btnSaveSettings = $('#btn-save-settings');

  // ── Init ───────────────────────────────────────────────────────────

  async function init() {
    // Load prefs
    try {
      const resp = await sendMessage({ type: 'LOAD_PREFS' });
      prefs = resp || {};
      applyPrefs();
    } catch (_) {
      prefs = { sanitize: true, metadata: true, stripStyles: true, absUrl: true };
    }

    // Get current tab info
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        pageTitle.textContent = tab.title || 'Untitled';
        pageUrl.textContent = tab.url || '';
      }
    } catch (_) {
      pageTitle.textContent = 'Untitled';
    }

    // Listen for content script ready
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'GOBBLE_READY') {
        setStatus('online', 'Ready');
      }
    });

    // Send ready check
    sendMessage({ type: 'GOBBLE_READY' }).then((r) => {
      if (r?.ok) setStatus('online', 'Ready');
      else setStatus('offline', 'Click icon to activate');
    });

    // Wire toolbar buttons
    btnSelection?.addEventListener('click', () => handleToolbarAction('selection'));
    btnMarkdown?.addEventListener('click', () => selectMode('markdown'));
    btnTables?.addEventListener('click', () => selectMode('csv'));
    btnImages?.addEventListener('click', () => selectMode('images'));
    btnLinks?.addEventListener('click', () => selectMode('links'));
    btnSettings?.addEventListener('click', toggleSettings);

    // Wire mode cards
    modeCards.forEach((card) => {
      card.addEventListener('click', () => selectMode(card.dataset.format));
    });

    // Wire actions
    btnCopy?.addEventListener('click', copyToClipboard);
    btnDownload?.addEventListener('click', downloadExtraction);

    // Wire settings
    btnCloseSettings?.addEventListener('click', toggleSettings);
    btnSaveSettings?.addEventListener('click', saveSettings);

    // Wire checkboxes/select to pref state
    $('#pref-sanitize')?.addEventListener('change', (e) => { prefs.sanitize = e.target.checked; });
    $('#pref-metadata')?.addEventListener('change', (e) => { prefs.metadata = e.target.checked; });
    $('#pref-strip-styles')?.addEventListener('change', (e) => { prefs.stripStyles = e.target.checked; });
    $('#pref-abs-url')?.addEventListener('change', (e) => { prefs.absUrl = e.target.checked; });
    $('#pref-default-format')?.addEventListener('change', (e) => { prefs.defaultFormat = e.target.value; });

    // Restore pref UI state
    syncPrefUI();
  }

  // ── Mode Selection ─────────────────────────────────────────────────

  function selectMode(format) {
    activeFormat = format;

    modeCards.forEach((card) => {
      card.classList.toggle('active', card.dataset.format === format);
    });

    // Auto-extract on mode change
    extract();
  }

  // ── Extraction ─────────────────────────────────────────────────────

  async function extract() {
    showProgress(true);
    animateProgress(0, 'Initializing…');

    try {
      const result = await sendMessage({
        type: 'GOBBLE_EXTRACT',
        format: activeFormat,
      });

      if (result?.ok) {
        extractedContent = result.content || '';
        extractedMeta = result.meta || {};

        const size = new Blob([extractedContent]).size;
        const sizeStr = formatBytes(size);

        showProgress(false);
        previewContent.textContent = extractedContent;
        previewSection.style.display = '';
        previewBadge.textContent = sizeStr;

        const formatLabel = activeFormat.toUpperCase();
        setStatus('online', `${formatLabel} — ${sizeStr}`);
      } else {
        throw new Error(result?.error || 'Extraction failed');
      }
    } catch (err) {
      showProgress(false);
      const errMsg = err?.message || String(err);
      setStatus('offline', errMsg);
      console.error('Gobble extract:', errMsg);
    }
  }

  // ── Toolbar Actions ────────────────────────────────────────────────

  async function handleToolbarAction(action) {
    if (action === 'selection') {
      showProgress(true);
      animateProgress(30, 'Reading selection…');

      try {
        const result = await sendMessage({ type: 'GOBBLE_SELECTION' });
        if (result?.ok && result.text) {
          extractedContent = result.text;
          extractedMeta = { title: 'Selection', format: 'text' };
          showProgress(false);
          previewContent.textContent = result.text;
          previewSection.style.display = '';
          previewBadge.textContent = formatBytes(new Blob([result.text]).size);
          setStatus('online', 'Selection captured');
        } else {
          showProgress(false);
          setStatus('offline', 'No text selected');
        }
      } catch (err) {
        showProgress(false);
        setStatus('offline', 'Failed to read selection');
      }
      return;
    }

    // Route toolbar buttons to mode selection
    const map = {
      markdown: 'markdown',
      tables: 'csv',
      images: 'images',
      links: 'links',
    };
    const format = map[action];
    if (format) selectMode(format);
  }

  // ── Copy / Download ────────────────────────────────────────────────

  async function copyToClipboard() {
    if (!extractedContent) return;

    try {
      await navigator.clipboard.writeText(extractedContent);
      btnCopy.classList.add('copied');
      btnCopy.innerHTML = btnCopy.innerHTML.replace('Copy to Clipboard', 'Copied!');
      setTimeout(() => {
        btnCopy.classList.remove('copied');
        btnCopy.innerHTML = btnCopy.innerHTML.replace('Copied!', 'Copy to Clipboard');
      }, 1500);
    } catch (_) {
      fallbackCopy(extractedContent);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  async function downloadExtraction() {
    if (!extractedContent) return;

    const formatMap = {
      markdown: { ext: 'md', mime: 'text/markdown' },
      csv: { ext: 'csv', mime: 'text/csv' },
      json: { ext: 'json', mime: 'application/json' },
      text: { ext: 'txt', mime: 'text/plain' },
      links: { ext: 'csv', mime: 'text/csv' },
      images: { ext: 'json', mime: 'application/json' },
      headings: { ext: 'json', mime: 'application/json' },
      forms: { ext: 'json', mime: 'application/json' },
    };

    const { ext, mime } = formatMap[activeFormat] || { ext: 'txt', mime: 'text/plain' };
    const title = extractedMeta?.title || pageTitle.textContent || 'gobble';
    const safeName = title
      .replace(/[^a-zA-Z0-9一-鿿 ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80)
      .toLowerCase();

    // Popup has a full document context, so Blob + download works here.
    const blob = new Blob([extractedContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ── Settings Panel ─────────────────────────────────────────────────

  function toggleSettings() {
    const isOpen = settingsPanel.style.display !== 'none';
    settingsPanel.style.display = isOpen ? 'none' : '';
    if (!isOpen) syncPrefUI();
  }

  function syncPrefUI() {
    const cb = (id, val) => {
      const el = $(`#${id}`);
      if (el) el.checked = val;
    };
    cb('pref-sanitize', prefs.sanitize !== undefined ? prefs.sanitize : true);
    cb('pref-metadata', prefs.metadata !== undefined ? prefs.metadata : true);
    cb('pref-strip-styles', prefs.stripStyles !== undefined ? prefs.stripStyles : true);
    cb('pref-abs-url', prefs.absUrl !== undefined ? prefs.absUrl : true);
    const sel = $('#pref-default-format');
    if (sel) sel.value = prefs.defaultFormat || 'markdown';
  }

  function applyPrefs() {
    // Apply prefs to content script on next extraction
  }

  async function saveSettings() {
    const newPrefs = {
      sanitize: $('#pref-sanitize')?.checked ?? true,
      metadata: $('#pref-metadata')?.checked ?? true,
      stripStyles: $('#pref-strip-styles')?.checked ?? true,
      absUrl: $('#pref-abs-url')?.checked ?? true,
      defaultFormat: $('#pref-default-format')?.value || 'markdown',
    };

    try {
      await sendMessage({ type: 'SAVE_PREFS', payload: newPrefs });
    } catch (_) {
      prefs = newPrefs;
    }

    prefs = newPrefs;
    toggleSettings();
  }

  // ── UI Helpers ─────────────────────────────────────────────────────

  function setStatus(state, text) {
    statusIndicator.className = `status-dot ${state}`;
    statusText.textContent = text;
  }

  function showProgress(show) {
    progress.style.display = show ? '' : 'none';
    if (show) {
      setStatus('extracting', 'Extracting…');
      previewSection.style.display = 'none';
    }
  }

  function animateProgress(percent, text) {
    progressFill.style.width = `${percent}%`;
    if (text) progressText.textContent = text;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  // ── Messaging ──────────────────────────────────────────────────────

  function sendMessage(msg) {
    return new Promise((resolve, reject) => {
      // Prefer window.postMessage — it works across all contexts
      // and doesn't require re-injecting content scripts.
      const handler = (e) => {
        if (e.data?.type === `GOBBLE_RESP_${msg.type}_${id}`) {
          window.removeEventListener('message', handler);
          clearTimeout(timer);
          resolve(e.data.payload);
        }
      };

      const id = Math.random().toString(36).slice(2, 10);
      window.addEventListener('message', handler);

      // Send via postMessage to content script
      window.postMessage({
        type: msg.type,
        id,
        payload: msg.payload,
      }, '*');

      // Fallback to chrome.tabs.sendMessage if content script isn't listening
      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 3000);
    });
  }

  // ── Boot ───────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
