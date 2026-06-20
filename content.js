// ── Gobble Content Script ───────────────────────────────────────────
// Runs inside the target page. Provides extraction engines for
// Markdown, CSV, JSON, plain text, and raw HTML.

(function () {
  'use strict';

  // Guard against double-injection.
  if (window.__gobbleInjected__) return;
  window.__gobbleInjected__ = true;

  // ── Helpers ────────────────────────────────────────────────────────

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /** Remove noise elements from a cloned subtree. */
  function sanitizeRoot(root) {
    const selectors = [
      'script', 'style', 'noscript', 'iframe', 'link',
      'nav', 'footer', 'header', 'aside',
      '[role="navigation"]', '[role="complementary"]',
      '[hidden]', '[aria-hidden="true"]',
      '.ads', '.advertisement', '.ad-', '.banner',
      '.cookie-banner', '.popup', '.modal-overlay',
      'social-share', '.social-bar', '.share-buttons',
      '.breadcrumbs', '.breadcrumb', '.skip-link',
      '.back-to-top', '.related-posts', '.recommended',
      '.sidebar', '.widget', '.tm-box', '.taboola',
    ];
    selectors.forEach((sel) => {
      try {
        $$(sel, root).forEach((el) => el.remove());
      } catch (_) {
        // Some selectors may be invalid; skip.
      }
    });
    return root;
  }

  /** Clone the body and sanitize it. */
  function getCleanBody() {
    const clone = document.body.cloneNode(true);
    return sanitizeRoot(clone);
  }

  /** Extract page metadata. */
  function getPageMeta() {
    const og = (prop) => $(`meta[property="${prop}"]`)?.getAttribute('content')
      || $(`meta[name="${prop}"]`)?.getAttribute('content');
    return {
      title: document.title,
      url: window.location.href,
      date: new Date().toISOString(),
      author: og('author') || og('article:author') || $('meta[name="author"]')?.content || 'Unknown',
      description: og('description') || $('meta[name="description"]')?.content || '',
      image: og('image') || og('og:image') || '',
      siteName: og('siteName') || og('og:site_name') || '',
    };
  }

  // ── Extractors ─────────────────────────────────────────────────────

  /** Convert a DOM subtree to Markdown using a lightweight approach. */
  function toMarkdown(root) {
    const lines = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, {
      acceptNode(node) {
        // Skip hidden/noise nodes.
        if (node.nodeType === 8) return NodeFilter.FILTER_REJECT; // comments
        if (node.nodeType === 3) {
          // Skip pure-whitespace text nodes inside certain elements.
          const parent = node.parentElement;
          if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    function indent(depth) {
      return '  '.repeat(depth);
    }

    function walk(node, depth = 0) {
      if (node.nodeType === 3) {
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        if (text) lines.push(indent(depth) + text);
        return;
      }
      if (node.nodeType !== 1) return;

      const tag = node.tagName.toLowerCase();
      const children = [...node.childNodes];

      switch (tag) {
        case 'h1': lines.push(`# ${children.map(c => c.textContent.trim()).join(' ').slice(0, 200)}`); break;
        case 'h2': lines.push(`## ${children.map(c => c.textContent.trim()).join(' ').slice(0, 200)}`); break;
        case 'h3': lines.push(`### ${children.map(c => c.textContent.trim()).join(' ').slice(0, 200)}`); break;
        case 'h4': lines.push(`#### ${children.map(c => c.textContent.trim()).join(' ').slice(0, 200)}`); break;
        case 'h5': lines.push(`##### ${children.map(c => c.textContent.trim()).join(' ').slice(0, 200)}`); break;
        case 'h6': lines.push(`###### ${children.map(c => c.textContent.trim()).join(' ').slice(0, 200)}`); break;
        case 'p': {
          const text = children.map(c => c.textContent?.trim() || '').join(' ').trim();
          if (text) lines.push(text);
          break;
        }
        case 'br': lines.push(''); break;
        case 'blockquote': {
          lines.push('> ' + children.map(c => c.textContent?.trim() || '').join(' ').slice(0, 500));
          break;
        }
        case 'ul':
        case 'ol': {
          let idx = tag === 'ol' ? 1 : 0;
          children.forEach((child) => {
            if (child.tagName?.toLowerCase() === 'li') {
              const bullet = tag === 'ol' ? `${idx}.` : '-';
              const inner = child.children.length > 0
                ? child.children[0].textContent?.trim() || ''
                : child.textContent?.trim() || '';
              lines.push(`${indent(depth)}${bullet} ${inner.slice(0, 300)}`);
              idx++;
            }
          });
          break;
        }
        case 'pre': {
          const code = node.querySelector('code');
          const lang = code?.className?.match(/language-(\S+)/)?.[1] || '';
          const text = (code || node).textContent;
          lines.push('');
          lines.push(indent(depth) + `\`\`\`${lang}`);
          lines.push(indent(depth) + text.split('\n').map(l => l.slice(0, 300)).join('\n'));
          lines.push(indent(depth) + '```');
          lines.push('');
          break;
        }
        case 'code': {
          const text = node.textContent;
          if (text.trim()) {
            lines.push(indent(depth) + '`' + text.slice(0, 200) + '`');
          }
          break;
        }
        case 'a': {
          const href = node.getAttribute('href') || '';
          const text = node.textContent.trim();
          if (href && text) {
            lines.push(indent(depth) + `[${text}](${href})`);
          } else if (text) {
            lines.push(indent(depth) + text);
          }
          break;
        }
        case 'img': {
          const src = node.getAttribute('src') || '';
          const alt = node.getAttribute('alt') || '';
          if (src) lines.push(indent(depth) + `![${alt}](${src})`);
          break;
        }
        case 'table': {
          const headers = $$('.thead tr th, table thead th, table thead td, table tr:first-child th, table tr:first-child td', node);
          const rows = $$('.tbody tr, table tbody tr, table tr:not(:first-child)', node);

          if (headers.length === 0 && rows.length === 0) {
            // Fallback: simple text extraction.
            lines.push(children.map(c => c.textContent?.trim() || '').join(' ').trim());
            break;
          }

          // Build table.
          const headerTexts = headers.map(h => (h.textContent || '').trim().replace(/\|/g, '\\|').replace(/\n/g, ' '));
          lines.push(indent(depth) + '| ' + headerTexts.join(' | ') + ' |');
          lines.push(indent(depth) + '| ' + headerTexts.map(() => '---').join(' | ') + ' |');

          const tableRows = rows.length > 0 ? rows : $$('.tbody tr, table tbody tr', node);
          tableRows.forEach((row) => {
            const cells = [...row.children].filter(c => ['TD', 'TH'].includes(c.tagName));
            const cellTexts = cells.map(c => (c.textContent || '').trim().replace(/\|/g, '\\|').replace(/\n/g, ' '));
            lines.push(indent(depth) + '| ' + cellTexts.join(' | ') + ' |');
          });
          break;
        }
        case 'li':
          // Handled by ul/ol.
          break;
        case 'section':
        case 'article':
        case 'div':
        case 'main':
          children.forEach(c => walk(c, depth));
          break;
        case 'strong':
        case 'b': {
          const text = children.map(c => c.textContent?.trim() || '').join('');
          lines.push(indent(depth) + `**${text}**`);
          break;
        }
        case 'em':
        case 'i': {
          const text = children.map(c => c.textContent?.trim() || '').join('');
          lines.push(indent(depth) + `_${text}_`);
          break;
        }
        case 'hr': lines.push(indent(depth) + '---'); break;
        default: {
          // For unhandled elements, recurse.
          if (children.length > 0) {
            children.forEach(c => walk(c, depth));
          } else {
            const text = node.textContent?.trim();
            if (text) lines.push(indent(depth) + text.slice(0, 300));
          }
        }
      }
    }

    [...root.childNodes].forEach((child) => walk(child, 0));
    return lines.join('\n\n');
  }

  /** Extract all tables from the page as CSV. */
  function extractTablesAsCSV() {
    const tables = $$('table');
    const sheets = [];

    tables.forEach((table) => {
      const headers = $$('thead th, tbody tr:first-child td, tbody tr:first-child th, tr:first-child th, tr:first-child td', table);
      const rows = $$('tbody tr, tr:not(:first-child)', table);

      const headerTexts = headers.map(h => {
        const t = (h.textContent || '').trim().replace(/"/g, '""').replace(/\n/g, ' ');
        return `"${t}"`;
      });

      if (headerTexts.length > 0) {
        sheets.push(headerTexts.join(','));
      }

      rows.forEach((row) => {
        const cells = [...row.children].filter(c => ['TD', 'TH'].includes(c.tagName));
        const cellTexts = cells.map(c => {
          const t = (c.textContent || '').trim().replace(/"/g, '""').replace(/\n/g, ' ');
          return `"${t}"`;
        });
        sheets.push(cellTexts.join(','));
      });
    });

    return sheets.join('\n');
  }

  /** Extract all links from the page as CSV. */
  function extractLinksAsCSV() {
    const links = $$('a[href]');
    const rows = ['"Text","URL"'];

    links.forEach((a) => {
      const text = (a.textContent || '').trim().replace(/"/g, '""').replace(/\n/g, ' ').slice(0, 200);
      const href = a.getAttribute('href') || '';
      if (text && href) {
        rows.push(`"${text}","${href}"`);
      }
    });

    return rows.join('\n');
  }

  /** Extract all images from the page as JSON. */
  function extractImagesAsJSON() {
    const imgs = $$('img[src]');
    return JSON.stringify(
      imgs.map((img) => ({
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || '',
        width: img.naturalWidth || 0,
        height: img.naturalHeight || 0,
        loading: img.getAttribute('loading') || 'eager',
      })),
      null,
      2
    );
  }

  /** Extract all headings and their text as a structured outline. */
  function extractHeadingsAsJSON() {
    const headings = $$('h1, h2, h3, h4, h5, h6');
    return JSON.stringify(
      headings.map((h) => ({
        level: parseInt(h.tagName[1], 10),
        text: (h.textContent || '').trim().slice(0, 300),
      })),
      null,
      2
    );
  }

  /** Extract page text (visible only) as plain text. */
  function extractPlainText() {
    const clone = getCleanBody();
    // Hide non-visible elements.
    const style = document.createElement('style');
    style.textContent = `
      [style*="display: none"] { display: none !important; }
      [style*="visibility: hidden"] { visibility: hidden !important; }
      [style*="opacity: 0"] { opacity: 0 !important; }
    `;
    clone.appendChild(style);
    return clone.textContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join('\n\n');
  }

  /** Extract form data from the page. */
  function extractFormsAsJSON() {
    const forms = $$('form');
    return JSON.stringify(
      forms.map((form) => {
        const inputs = $$('input, textarea, select', form);
        const fields = inputs.map((inp) => {
          const type = inp.getAttribute('type') || 'text';
          const name = inp.getAttribute('name') || inp.getAttribute('id') || '';
          const value = inp.value || '';
          const placeholder = inp.getAttribute('placeholder') || '';
          return { type, name, placeholder, value };
        });
        return {
          action: form.getAttribute('action') || '',
          method: form.getAttribute('method') || 'GET',
          fields,
        };
      }),
      null,
      2
    );
  }

  // ── Full-page extraction (all formats) ─────────────────────────────

  /**
   * Extract the full page content in the requested format.
   * @param {'markdown'|'csv'|'json'|'text'|'links'|'tables'|'images'|'headings'|'forms'|'raw'} format
   */
  function extract(format) {
    const meta = getPageMeta();
    let content = '';

    switch (format) {
      case 'markdown': {
        const root = getCleanBody();
        const md = toMarkdown(root);
        const fm = `---\ntitle: "${meta.title.replace(/"/g, '\\"')}"\nurl: "${meta.url}"\ndate: "${meta.date}"\nauthor: "${meta.author.replace(/"/g, '\\"')}"\n${meta.description ? `description: "${meta.description.replace(/"/g, '\\"')}"\n` : ''}${meta.siteName ? `site_name: "${meta.siteName.replace(/"/g, '\\"')}"\n` : ''}---\n\n`;
        content = fm + md;
        break;
      }
      case 'csv': {
        content = extractTablesAsCSV();
        break;
      }
      case 'json': {
        const root = getCleanBody();
        const md = toMarkdown(root);
        content = JSON.stringify({
          metadata: meta,
          content: md,
          extractedAt: new Date().toISOString(),
        }, null, 2);
        break;
      }
      case 'text': {
        content = extractPlainText();
        break;
      }
      case 'links': {
        content = extractLinksAsCSV();
        break;
      }
      case 'tables': {
        content = extractTablesAsCSV();
        break;
      }
      case 'images': {
        content = extractImagesAsJSON();
        break;
      }
      case 'headings': {
        content = extractHeadingsAsJSON();
        break;
      }
      case 'forms': {
        content = extractFormsAsJSON();
        break;
      }
      case 'raw': {
        // Return sanitized HTML.
        const clone = getCleanBody();
        content = clone.outerHTML;
        break;
      }
      default: {
        content = toMarkdown(getCleanBody());
      }
    }

    return { content, meta };
  }

  // ── Selection extraction ───────────────────────────────────────────

  /** Extract the currently selected text. */
  function extractSelection() {
    const sel = window.getSelection();
    if (!sel || !sel.toString().trim()) return null;
    return sel.toString().trim();
  }

  // ── Message listener ───────────────────────────────────────────────

  try {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GOBBLE_EXTRACT') {
      try {
        const result = extract(message.format || 'markdown');
        sendResponse({ ok: true, ...result });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
      return true; // async response
    }

    if (message.type === 'GOBBLE_SELECTION') {
      const text = extractSelection();
      sendResponse({ ok: !!text, text });
      return false;
    }

    if (message.type === 'GOBBLE_READY') {
      sendResponse({ ok: true, version: '1.0.0' });
      return false;
    }

    if (message.type === 'GOBBLE_CAPTURE') {
      try {
        setFabState('capturing');
        const result = extract('markdown');
        sendResponse({ ok: true, content: result.content, meta: result.meta });
        // Optimistically show success; actual status updated by badge
        setTimeout(() => setFabState('sent'), 1500);
        setTimeout(() => setFabState('idle'), 3500);
      } catch (err) {
        setFabState('failed');
        sendResponse({ ok: false, error: err.message });
        setTimeout(() => setFabState('idle'), 2000);
      }
      return true;
    }

    if (message.type === 'GOBBLE_CAPTURE_STATUS') {
      setFabState(message.status); // 'sent' or 'failed'
      if (message.status === 'sent') {
        setTimeout(() => setFabState('idle'), 2000);
      }
      updateFabBadge();
      return false;
    }

    return false;
  });
  } catch (_) { /* Extension context invalidated at injection time */ }

  // ── PostMessage bridge (popup ↔ content script) ────────────────────

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg?.type || !msg?.id) return;

    if (msg.type === 'GOBBLE_EXTRACT') {
      try {
        const result = extract(msg.payload || 'markdown');
        window.postMessage({ type: `GOBBLE_RESP_${msg.type}_${msg.id}`, payload: { ok: true, ...result } }, '*');
      } catch (err) {
        window.postMessage({ type: `GOBBLE_RESP_${msg.type}_${msg.id}`, payload: { ok: false, error: err.message } }, '*');
      }
    }

    if (msg.type === 'GOBBLE_SELECTION') {
      const text = extractSelection();
      window.postMessage({ type: `GOBBLE_RESP_${msg.type}_${msg.id}`, payload: { ok: !!text, text } }, '*');
    }

    if (msg.type === 'GOBBLE_READY') {
      window.postMessage({ type: `GOBBLE_RESP_${msg.type}_${msg.id}`, payload: { ok: true, version: '1.0.0' } }, '*');
    }
  });

  // ── Notify popup that content script is ready ──────────────────────

  window.postMessage({ type: 'GOBBLE_READY' }, '*');

  // ── Floating Toolbar Overlay ───────────────────────────────────────

  (function injectToolbar() {
    if (document.getElementById('gobble-overlay')) return;

    const container = document.createElement('div');
    container.id = 'gobble-overlay';
    container.innerHTML = `
      <div id="gobble-menu">
        <button class="gobble-menu-item" data-action="markdown">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M7 16V8l2 6 2-6v8"/><path d="M15 8v8"/></svg>
          Full Page — Markdown
        </button>
        <button class="gobble-menu-item" data-action="csv">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
          Tables — CSV
        </button>
        <button class="gobble-menu-item" data-action="json">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 4H4v4h4v8h8v-4h4V4h-4v8H8V4z"/></svg>
          Structured — JSON
        </button>
        <button class="gobble-menu-item" data-action="text">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
          Plain Text
        </button>
        <div class="gobble-divider"></div>
        <button class="gobble-menu-item" data-action="links">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg>
          Links — CSV
        </button>
        <button class="gobble-menu-item" data-action="images">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5-8 8"/></svg>
          Images — JSON
        </button>
        <button class="gobble-menu-item" data-action="selection">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18"/><path d="M8 7l4-4 4 4"/></svg>
          Selected Text
        </button>
      </div>
      <button id="gobble-fab">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Gobble
      </button>
    `;

    document.body.appendChild(container);

    const fab = container.querySelector('#gobble-fab');
    const menu = container.querySelector('#gobble-menu');

    fab.addEventListener('click', () => {
      menu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.gobble-menu-item');
      if (!item) return;
      const action = item.dataset.action;
      menu.classList.remove('open');

      if (action === 'selection') {
        const text = extractSelection();
        if (text) {
          sendCaptureToBackend(text, 'text');
          showToast('Selection captured ✓');
        } else {
          showToast('No text selected');
        }
        return;
      }

      downloadExtraction(action);
    });

    function downloadExtraction(format) {
      try {
        showToast('Extracting…');
        const result = extract(format);
        if (!result?.content) {
          showToast('Extraction failed');
          return;
        }

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

        const { ext, mime } = formatMap[format] || { ext: 'txt', mime: 'text/plain' };
        const title = (result.meta?.title || document.title || 'gobble')
          .replace(/[^a-zA-Z0-9一-鿿 ]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .slice(0, 80)
          .toLowerCase();

        const blob = new Blob([result.content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        showToast('Downloaded ✓');

        sendCaptureToBackend(result.content, format, result.meta);
      } catch (err) {
        showToast('Error: ' + err.message);
        console.error('Gobble download:', err);
      }
    }

    function showToast(msg) {
      let toast = document.getElementById('gobble-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'gobble-toast';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function sendCaptureToBackend(content, format, meta) {
      trySafeSendMessage({
        type: 'GOBBLE_CAPTURE',
        payload: {
          extraction: { content, format },
          tabInfo: {
            title: meta?.title || document.title,
            url: meta?.url || window.location.href,
          },
        },
      });
    }

  // ── FAB state management ───────────────────────────────────────────

  let _fabStateGeneration = 0;

  function setFabState(state) {
    const gen = ++_fabStateGeneration;
    const fab = document.getElementById('gobble-fab');
    if (!fab) return;

    const setState = (s) => {
      if (gen !== _fabStateGeneration) return; // stale call
      switch (s) {
        case 'capturing':
          fab.innerHTML = `<svg class="gobble-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="15"/></svg> Capturing…`;
          fab.style.background = 'linear-gradient(135deg, #FF9500, #FF6B00)';
          break;
        case 'sent':
          fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> Sent`;
          fab.style.background = 'linear-gradient(135deg, #34C759, #30B350)';
          break;
        case 'failed':
          fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg> Failed`;
          fab.style.background = 'linear-gradient(135deg, #FF3B30, #E0332A)';
          break;
        default:
          fab.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Gobble
          `;
          fab.style.background = 'linear-gradient(135deg, #1FB5B8, #073B4C)';
      }
    };

    setState(state);
  }

    function updateFabBadge() {
      if (!chrome.storage?.local) return;
      try {
        chrome.storage.local.get(['gobble_capture_queue'], (res) => {
          try {
            if (chrome.runtime.lastError) return;
            const queue = res.gobble_capture_queue || [];
            let badge = document.getElementById('gobble-badge');
            if (queue.length > 0) {
              if (!badge) {
                badge = document.createElement('span');
                badge.id = 'gobble-badge';
                badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#FF3B30;color:#fff;font-size:10px;font-weight:700;padding:2px 5px;border-radius:10px;min-width:16px;text-align:center;z-index:1;';
                const fab = document.getElementById('gobble-fab');
                if (fab) {
                  fab.style.position = 'relative';
                  fab.appendChild(badge);
                }
              }
              badge.textContent = queue.length > 99 ? '99+' : queue.length;
              badge.style.display = '';
            } else if (badge) {
              badge.style.display = 'none';
            }
          } catch (_) {}
        });
      } catch (_) {
        // Extension context invalidated
      }
    }

    /** Safely send a message, swallowing "context invalidated" errors. */
    function trySafeSendMessage(msg) {
      try {
        chrome.runtime.sendMessage(msg, (response) => {
          try {
            if (chrome.runtime.lastError) return;
            if (response?.ok) showToast('Sent to backend ✓');
          } catch (_) {}
        });
      } catch (_) {
        // Extension context was invalidated (reload, tab navigation, etc.)
      }
    }
    // Update badge periodically
    const badgeInterval = setInterval(() => {
      if (!chrome.storage?.local) {
        clearInterval(badgeInterval);
        return;
      }
      updateFabBadge();
    }, 30000);
    updateFabBadge();
  })();

})();
