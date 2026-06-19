(function () {
  'use strict';

  const PROFILES_KEY = 'gobble_backend_profiles';
  const LIMITS_KEY = 'gobble_limits';

  let profiles = [];
  let limits = { queueLimit: 200, historyLimit: 200 };

  // ── DOM refs ──────────────────────────────────────────────────────
  const profilesList = document.getElementById('profiles-list');
  const btnAddProfile = document.getElementById('btn-add-profile');
  const btnSave = document.getElementById('btn-save');
  const prefQueueLimit = document.getElementById('pref-queue-limit');
  const prefHistoryLimit = document.getElementById('pref-history-limit');

  // ── Init ──────────────────────────────────────────────────────────

  async function init() {
    const [profResult, limResult] = await Promise.all([
      chrome.storage.local.get([PROFILES_KEY]),
      chrome.storage.local.get([LIMITS_KEY]),
    ]);
    profiles = profResult[PROFILES_KEY] || [];
    limits = limResult[LIMITS_KEY] || { queueLimit: 200, historyLimit: 200 };

    prefQueueLimit.value = limits.queueLimit;
    prefHistoryLimit.value = limits.historyLimit;
    renderProfiles();
  }

  // ── Render profiles ───────────────────────────────────────────────

  function renderProfiles() {
    profilesList.innerHTML = '';
    profiles.forEach((profile, index) => {
      const card = document.createElement('div');
      card.className = 'profile-card';
      card.innerHTML = `
        <div class="profile-header">
          <input class="profile-name" type="text" value="${escapeHtml(profile.name || 'Unnamed')}" placeholder="Profile name">
          <div class="radio-group">
            <input type="radio" name="default-profile" value="${index}" ${profile.default ? 'checked' : ''} title="Default profile">
            <span style="font-size:11px;color:var(--text-tertiary)">Default</span>
          </div>
          <div class="toggle-switch ${profile.enabled ? 'active' : ''}" data-index="${index}"></div>
          <button class="btn btn-sm danger btn-delete" data-index="${index}">&#x2715;</button>
        </div>
        <div class="field-row">
          <label>URL</label>
          <input type="url" class="profile-url" value="${escapeHtml(profile.baseUrl || 'http://localhost:6666')}" placeholder="http://localhost:6666">
        </div>
        <div class="field-row">
          <label>Endpoint</label>
          <input type="text" class="profile-endpoint" value="${escapeHtml(profile.endpoint || '/capture')}" placeholder="/capture">
        </div>
      `;
      profilesList.appendChild(card);
    });

    // Wire toggle switches
    profilesList.querySelectorAll('.toggle-switch').forEach((sw) => {
      sw.addEventListener('click', () => {
        const idx = parseInt(sw.dataset.index, 10);
        profiles[idx].enabled = !profiles[idx].enabled;
        sw.classList.toggle('active', profiles[idx].enabled);
      });
    });

    // Wire delete buttons
    profilesList.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        profiles.splice(idx, 1);
        renderProfiles();
      });
    });
  }

  // ── Save ──────────────────────────────────────────────────────────

  btnSave.addEventListener('click', async () => {
    // Update profiles from DOM
    const cards = profilesList.querySelectorAll('.profile-card');
    cards.forEach((card, index) => {
      const nameInput = card.querySelector('.profile-name');
      const urlInput = card.querySelector('.profile-url');
      const epInput = card.querySelector('.profile-endpoint');
      const radio = card.querySelector('input[name="default-profile"]');
      const toggle = card.querySelector('.toggle-switch');

      profiles[index] = {
        name: nameInput?.value || `Profile ${index + 1}`,
        baseUrl: urlInput?.value || 'http://localhost:6666',
        endpoint: epInput?.value || '/capture',
        enabled: toggle?.classList.contains('active') ?? false,
        default: radio?.checked ?? false,
      };
    });

    // Ensure at least one default
    if (!profiles.some((p) => p.default)) {
      profiles[0] && (profiles[0].default = true);
    }

    await Promise.all([
      chrome.storage.local.set({ [PROFILES_KEY]: profiles }),
      chrome.storage.local.set({
        [LIMITS_KEY]: {
          queueLimit: parseInt(prefQueueLimit.value, 10) || 200,
          historyLimit: parseInt(prefHistoryLimit.value, 10) || 200,
        },
      }),
    ]);

    btnSave.textContent = 'Saved ✓';
    btnSave.disabled = true;
    setTimeout(() => {
      btnSave.textContent = 'Save';
      btnSave.disabled = false;
    }, 2000);
  });

  // ── Add profile ───────────────────────────────────────────────────

  btnAddProfile.addEventListener('click', () => {
    profiles.push({
      name: `Profile ${profiles.length + 1}`,
      baseUrl: 'http://localhost:6666',
      endpoint: '/capture',
      enabled: true,
      default: profiles.length === 0,
    });
    renderProfiles();
  });

  // ── Helpers ───────────────────────────────────────────────────────

  function escapeHtml(str) {
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
