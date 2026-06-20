(function () {
  'use strict';

  const HISTORY_KEY = 'gobble_history';
  const QUEUE_KEY = 'gobble_capture_queue';
  const PROFILES_KEY = 'gobble_backend_profiles';

  let history = [];
  let queue = [];
  let profiles = [];

  const historyList = document.getElementById('history-list');
  const searchInput = document.getElementById('search-input');
  const filterProfile = document.getElementById('filter-profile');
  const btnClearAll = document.getElementById('btn-clear-all');
  const btnOpenOptions = document.getElementById('btn-open-options');

  // ── Init ──────────────────────────────────────────────────────────

  async function init() {
    const [histResult, queueResult, profResult] = await Promise.all([
      chrome.storage.local.get([HISTORY_KEY]),
      chrome.storage.local.get([QUEUE_KEY]),
      chrome.storage.local.get([PROFILES_KEY]),
    ]);
    history = histResult[HISTORY_KEY] || [];
    queue = queueResult[QUEUE_KEY] || [];
    profiles = profResult[PROFILES_KEY] || [];

    // Populate profile filter
    profiles.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      filterProfile.appendChild(opt);
    });

    render();
  }

  // ── Render ────────────────────────────────────────────────────────

  function render() {
    const search = searchInput.value.toLowerCase();
    const profileFilter = filterProfile.value;

    let filtered = history.filter((item) => {
      if (profileFilter && item.profile !== profileFilter) return false;
      if (search) {
        const haystack = `${item.tab?.title} ${item.tab?.url} ${item.profile}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    // Sort newest first
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (filtered.length === 0) {
      historyList.innerHTML = '<div class="empty-state"><p>No captures yet.</p><small>Start capturing pages to see them here.</small></div>';
      return;
    }

    historyList.innerHTML = '';
    filtered.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'capture-item';
      el.dataset.id = item.id;

      const statusClass = item.status === 'sent' ? 'sent' : item.status === 'failed' ? 'failed' : 'pending';
      const statusText = item.status === 'sent' ? 'Sent' : item.status === 'failed' ? 'Failed' : 'Pending';
      const timeStr = new Date(item.timestamp).toLocaleString();

      el.innerHTML = `
        <div class="capture-header">
          <span class="capture-title">${escapeHtml(item.tab?.title || 'Untitled')}</span>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="capture-url">${escapeHtml(item.tab?.url || '')}</div>
        <div class="capture-meta">
          <span>${timeStr}</span>
          <span>${escapeHtml(item.profile || 'default')}</span>
        </div>
        <div class="capture-detail">${escapeHtml(JSON.stringify(item.payload, null, 2))}</div>
        <div class="capture-actions">
          ${item.status !== 'sent' ? `<button class="btn retry-btn" data-id="${item.id}">Retry</button>` : ''}
          <button class="btn danger delete-btn" data-id="${item.id}">Delete</button>
        </div>
      `;

      // Expand/collapse
      el.addEventListener('click', (e) => {
        if (e.target.closest('.btn')) return;
        el.classList.toggle('expanded');
      });

      historyList.appendChild(el);
    });

    // Wire retry buttons
    historyList.querySelectorAll('.retry-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const item = history.find((h) => h.id === id);
        if (item) {
          await retryCapture(item);
        }
      });
    });

    // Wire delete buttons
    historyList.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        history = history.filter((h) => h.id !== id);
        await chrome.storage.local.set({ [HISTORY_KEY]: history });
        render();
      });
    });
  }

  // ── Retry capture ─────────────────────────────────────────────────

  async function retryCapture(item) {
    const profile = profiles.find((p) => p.name === item.profile) || profiles[0];
    if (!profile) {
      alert('No backend profile configured.');
      return;
    }

    let baseUrl = (profile.baseUrl || 'http://localhost:6666').replace(/\/$/, '');
    let endpoint = (profile.endpoint || '/capture') || '/capture';
    if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
    endpoint = endpoint.replace(/\/$/, '');

    try {
      const response = await fetch(baseUrl + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        item.status = 'sent';
        await chrome.storage.local.set({ [HISTORY_KEY]: history });
        render();
      } else {
        item.status = 'failed';
        await chrome.storage.local.set({ [HISTORY_KEY]: history });
        render();
      }
    } catch (e) {
      item.status = 'failed';
      await chrome.storage.local.set({ [HISTORY_KEY]: history });
      render();
    }
  }

  // ── Clear all ─────────────────────────────────────────────────────

  btnClearAll.addEventListener('click', async () => {
    if (confirm('Clear all captures?')) {
      history = [];
      await chrome.storage.local.set({ [HISTORY_KEY]: history });
      render();
    }
  });

  // ── Open options ──────────────────────────────────────────────────

  btnOpenOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ── Search/filter listeners ───────────────────────────────────────

  searchInput.addEventListener('input', render);
  filterProfile.addEventListener('change', render);

  // ── Helpers ───────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Boot ──────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
