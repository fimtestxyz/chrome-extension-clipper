(function () {
  if (document.getElementById('__md-export-btn')) return;

  // ── Turndown v7 (inlined, no external import needed) ─────────────

  var TurndownService = (function () {
    'use strict';
    function extend(destination) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) destination[key] = source[key];
        }
      }
      return destination;
    }
    function repeat(character, count) { return Array(count + 1).join(character); }
    function trimLeadingNewlines(string) { return string.replace(/^\n*/, ''); }
    function trimTrailingNewlines(string) {
      var indexEnd = string.length;
      while (indexEnd > 0 && string[indexEnd - 1] === '\n') indexEnd--;
      return string.substring(0, indexEnd);
    }
    function trimNewlines(string) { return trimTrailingNewlines(trimLeadingNewlines(string)); }
    var blockElements = ['ADDRESS','ARTICLE','ASIDE','AUDIO','BLOCKQUOTE','BODY','CANVAS','CENTER','DD','DIR','DIV','DL','DT','FIELDSET','FIGCAPTION','FIGURE','FOOTER','FORM','FRAMESET','H1','H2','H3','H4','H5','H6','HEADER','HGROUP','HR','HTML','ISINDEX','LI','MAIN','MENU','NAV','NOFRAMES','NOSCRIPT','OL','OUTPUT','P','PRE','SECTION','TABLE','TBODY','TD','TFOOT','TH','THEAD','TR','UL'];
    function isBlock(node) { return is(node, blockElements); }
    var voidElements = ['AREA','BASE','BR','COL','COMMAND','EMBED','HR','IMG','INPUT','KEYGEN','LINK','META','PARAM','SOURCE','TRACK','WBR'];
    function isVoid(node) { return is(node, voidElements); }
    function hasVoid(node) { return has(node, voidElements); }
    var meaningfulWhenBlankElements = ['A','TABLE','THEAD','TBODY','TFOOT','TH','TD','IFRAME','SCRIPT','AUDIO','VIDEO'];
    function isMeaningfulWhenBlank(node) { return is(node, meaningfulWhenBlankElements); }
    function hasMeaningfulWhenBlank(node) { return has(node, meaningfulWhenBlankElements); }
    function is(node, tagNames) { return tagNames.indexOf(node.nodeName) >= 0; }
    function has(node, tagNames) {
      return node.getElementsByTagName && tagNames.some(function (tagName) {
        return node.getElementsByTagName(tagName).length;
      });
    }
    var markdownEscapes = [[/\\/g,'\\\\'], [/\*/g,'\\*'], [/^-/g,'\\-'], [/^\+ /g,'\\+ '], [/^(=+)/g,'\\$1'], [/^(#{1,6}) /g,'\\$1 '], [/`/g,'\\`'], [/^~~~/g,'\\~~~'], [/\[/g,'\\['], [/\]/g,'\\]'], [/^>/g,'\\>'], [/_/g,'\\_'], [/^(\d+)\. /g,'$1\\. ']];
    function escapeMarkdown(string) {
      return markdownEscapes.reduce(function (acc, esc) { return acc.replace(esc[0], esc[1]); }, string);
    }
    function cleanAttribute(attribute) { return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : ''; }
    function escapeLinkDestination(dest) {
      var escaped = dest.replace(/([<>()])/g, '\\$1');
      return escaped.indexOf(' ') >= 0 ? '<' + escaped + '>' : escaped;
    }
    function escapeLinkTitle(title) { return title.replace(/"/g, '\\"'); }

    var rules = {};
    rules.paragraph = { filter: 'p', replacement: function (c) { return '\n\n' + c + '\n\n'; } };
    rules.lineBreak = { filter: 'br', replacement: function (c, n, o) { return o.br + '\n'; } };
    rules.heading = {
      filter: ['h1','h2','h3','h4','h5','h6'],
      replacement: function (c, node, o) {
        var hLevel = Number(node.nodeName.charAt(1));
        if (o.headingStyle === 'setext' && hLevel < 3) {
          var underline = repeat(hLevel === 1 ? '=' : '-', c.length);
          return '\n\n' + c + '\n' + underline + '\n\n';
        }
        return '\n\n' + repeat('#', hLevel) + ' ' + c + '\n\n';
      }
    };
    rules.blockquote = {
      filter: 'blockquote',
      replacement: function (c) { c = trimNewlines(c).replace(/^/gm, '> '); return '\n\n' + c + '\n\n'; }
    };
    rules.list = {
      filter: ['ul','ol'],
      replacement: function (c, node) {
        var parent = node.parentNode;
        if (parent.nodeName === 'LI' && parent.lastElementChild === node) return '\n' + c;
        return '\n\n' + c + '\n\n';
      }
    };
    rules.listItem = {
      filter: 'li',
      replacement: function (c, node, o) {
        var prefix = o.bulletListMarker + '   ';
        var parent = node.parentNode;
        if (parent.nodeName === 'OL') {
          var start = parent.getAttribute('start');
          var index = Array.prototype.indexOf.call(parent.children, node);
          prefix = (start ? Number(start) + index : index + 1) + '.  ';
        }
        var isParagraph = /\n$/.test(c);
        c = trimNewlines(c) + (isParagraph ? '\n' : '');
        c = c.replace(/\n/gm, '\n' + ' '.repeat(prefix.length));
        return prefix + c + (node.nextSibling ? '\n' : '');
      }
    };
    rules.indentedCodeBlock = {
      filter: function (node, o) {
        return o.codeBlockStyle === 'indented' && node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
      },
      replacement: function (c, node) { return '\n\n    ' + node.firstChild.textContent.replace(/\n/g, '\n    ') + '\n\n'; }
    };
    rules.fencedCodeBlock = {
      filter: function (node, o) {
        return o.codeBlockStyle === 'fenced' && node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
      },
      replacement: function (c, node, o) {
        var className = node.firstChild.getAttribute('class') || '';
        var language = (className.match(/language-(\S+)/) || [null, ''])[1];
        var code = node.firstChild.textContent;
        var fenceChar = o.fence.charAt(0);
        var fenceSize = 3;
        var fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');
        var match;
        while ((match = fenceInCodeRegex.exec(code))) {
          if (match[0].length >= fenceSize) fenceSize = match[0].length + 1;
        }
        var fence = repeat(fenceChar, fenceSize);
        return '\n\n' + fence + language + '\n' + code.replace(/\n$/, '') + '\n' + fence + '\n\n';
      }
    };
    rules.horizontalRule = { filter: 'hr', replacement: function (c, n, o) { return '\n\n' + o.hr + '\n\n'; } };
    rules.inlineLink = {
      filter: function (node, o) { return o.linkStyle === 'inlined' && node.nodeName === 'A' && node.getAttribute('href'); },
      replacement: function (c, node) {
        var href = escapeLinkDestination(node.getAttribute('href'));
        var title = escapeLinkTitle(cleanAttribute(node.getAttribute('title')));
        return '[' + c + '](' + href + (title ? ' "' + title + '"' : '') + ')';
      }
    };
    rules.referenceLink = {
      filter: function (node, o) { return o.linkStyle === 'referenced' && node.nodeName === 'A' && node.getAttribute('href'); },
      replacement: function (c, node, o) {
        var href = escapeLinkDestination(node.getAttribute('href'));
        var title = cleanAttribute(node.getAttribute('title'));
        if (title) title = ' "' + escapeLinkTitle(title) + '"';
        var replacement, reference;
        switch (o.linkReferenceStyle) {
          case 'collapsed': replacement = '[' + c + '][]'; reference = '[' + c + ']: ' + href + title; break;
          case 'shortcut':  replacement = '[' + c + ']';   reference = '[' + c + ']: ' + href + title; break;
          default:
            var id = this.references.length + 1;
            replacement = '[' + c + '][' + id + ']';
            reference = '[' + id + ']: ' + href + title;
        }
        this.references.push(reference);
        return replacement;
      },
      references: [],
      append: function (o) {
        var refs = '';
        if (this.references.length) { refs = '\n\n' + this.references.join('\n') + '\n\n'; this.references = []; }
        return refs;
      }
    };
    rules.emphasis = {
      filter: ['em','i'],
      replacement: function (c, n, o) { if (!c.trim()) return ''; return o.emDelimiter + c + o.emDelimiter; }
    };
    rules.strong = {
      filter: ['strong','b'],
      replacement: function (c, n, o) { if (!c.trim()) return ''; return o.strongDelimiter + c + o.strongDelimiter; }
    };
    rules.code = {
      filter: function (node) {
        var hasSiblings = node.previousSibling || node.nextSibling;
        return node.nodeName === 'CODE' && !(node.parentNode.nodeName === 'PRE' && !hasSiblings);
      },
      replacement: function (c) {
        if (!c) return '';
        c = c.replace(/\r?\n|\r/g, ' ');
        var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(c) ? ' ' : '';
        var delimiter = '`';
        var matches = c.match(/`+/gm) || [];
        while (matches.indexOf(delimiter) !== -1) delimiter += '`';
        return delimiter + extraSpace + c + extraSpace + delimiter;
      }
    };
    rules.image = {
      filter: 'img',
      replacement: function (c, node) {
        var alt = escapeMarkdown(cleanAttribute(node.getAttribute('alt')));
        var src = escapeLinkDestination(node.getAttribute('src') || '');
        var title = cleanAttribute(node.getAttribute('title'));
        return src ? '![' + alt + '](' + src + (title ? ' "' + escapeLinkTitle(title) + '"' : '') + ')' : '';
      }
    };

    function Rules(options) {
      this.options = options;
      this._keep = []; this._remove = [];
      this.blankRule = { replacement: options.blankReplacement };
      this.keepReplacement = options.keepReplacement;
      this.defaultRule = { replacement: options.defaultReplacement };
      this.array = [];
      for (var key in options.rules) this.array.push(options.rules[key]);
    }
    Rules.prototype = {
      add: function (key, rule) { this.array.unshift(rule); },
      keep: function (filter) { this._keep.unshift({ filter: filter, replacement: this.keepReplacement }); },
      remove: function (filter) { this._remove.unshift({ filter: filter, replacement: function () { return ''; } }); },
      forNode: function (node) {
        if (node.isBlank) return this.blankRule;
        var rule;
        if ((rule = findRule(this.array, node, this.options))) return rule;
        if ((rule = findRule(this._keep, node, this.options))) return rule;
        if ((rule = findRule(this._remove, node, this.options))) return rule;
        return this.defaultRule;
      },
      forEach: function (fn) { for (var i = 0; i < this.array.length; i++) fn(this.array[i], i); }
    };
    function findRule(rules, node, options) {
      for (var i = 0; i < rules.length; i++) { if (filterValue(rules[i], node, options)) return rules[i]; }
    }
    function filterValue(rule, node, options) {
      var filter = rule.filter;
      if (typeof filter === 'string') return filter === node.nodeName.toLowerCase();
      if (Array.isArray(filter)) return filter.indexOf(node.nodeName.toLowerCase()) > -1;
      if (typeof filter === 'function') return filter.call(rule, node, options);
      throw new TypeError('`filter` needs to be a string, array, or function');
    }

    function collapseWhitespace(options) {
      var element = options.element, isBlock = options.isBlock, isVoid = options.isVoid;
      var isPre = options.isPre || function (n) { return n.nodeName === 'PRE'; };
      if (!element.firstChild || isPre(element)) return;
      var prevText = null, keepLeadingWs = false, prev = null;
      var node = next(prev, element, isPre);
      while (node !== element) {
        if (node.nodeType === 3 || node.nodeType === 4) {
          var text = node.data.replace(/[ \r\n\t]+/g, ' ');
          if ((!prevText || / $/.test(prevText.data)) && !keepLeadingWs && text[0] === ' ') text = text.substr(1);
          if (!text) { node = remove(node); continue; }
          node.data = text; prevText = node;
        } else if (node.nodeType === 1) {
          if (isBlock(node) || node.nodeName === 'BR') { if (prevText) prevText.data = prevText.data.replace(/ $/, ''); prevText = null; keepLeadingWs = false; }
          else if (isVoid(node) || isPre(node)) { prevText = null; keepLeadingWs = true; }
          else if (prevText) keepLeadingWs = false;
        } else { node = remove(node); continue; }
        var nextNode = next(prev, node, isPre); prev = node; node = nextNode;
      }
      if (prevText) { prevText.data = prevText.data.replace(/ $/, ''); if (!prevText.data) remove(prevText); }
    }
    function remove(node) { var n = node.nextSibling || node.parentNode; node.parentNode.removeChild(node); return n; }
    function next(prev, current, isPre) {
      if (prev && prev.parentNode === current || isPre(current)) return current.nextSibling || current.parentNode;
      return current.firstChild || current.nextSibling || current.parentNode;
    }

    var root = typeof window !== 'undefined' ? window : {};
    function canParseHTMLNatively() {
      var Parser = root.DOMParser, canParse = false;
      try { if (new Parser().parseFromString('', 'text/html')) canParse = true; } catch (e) {}
      return canParse;
    }
    function createHTMLParser() {
      var Parser = function () {};
      Parser.prototype.parseFromString = function (string) {
        var doc = document.implementation.createHTMLDocument('');
        doc.open(); doc.write(string); doc.close(); return doc;
      };
      return Parser;
    }
    var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();

    function RootNode(input, options) {
      var root;
      if (typeof input === 'string') {
        var doc = htmlParser().parseFromString('<x-turndown id="turndown-root">' + input + '</x-turndown>', 'text/html');
        root = doc.getElementById('turndown-root');
      } else { root = input.cloneNode(true); }
      collapseWhitespace({ element: root, isBlock: isBlock, isVoid: isVoid, isPre: options.preformattedCode ? isPreOrCode : null });
      return root;
    }
    var _htmlParser;
    function htmlParser() { _htmlParser = _htmlParser || new HTMLParser(); return _htmlParser; }
    function isPreOrCode(node) { return node.nodeName === 'PRE' || node.nodeName === 'CODE'; }

    function Node(node, options) {
      node.isBlock = isBlock(node);
      node.isCode = node.nodeName === 'CODE' || node.parentNode.isCode;
      node.isBlank = isBlank(node);
      node.flankingWhitespace = flankingWhitespace(node, options);
      return node;
    }
    function isBlank(node) {
      return !isVoid(node) && !isMeaningfulWhenBlank(node) && /^\s*$/i.test(node.textContent) && !hasVoid(node) && !hasMeaningfulWhenBlank(node);
    }
    function flankingWhitespace(node, options) {
      if (node.isBlock || options.preformattedCode && node.isCode) return { leading: '', trailing: '' };
      var edges = edgeWhitespace(node.textContent);
      if (edges.leadingAscii && isFlankedByWhitespace('left', node, options)) edges.leading = edges.leadingNonAscii;
      if (edges.trailingAscii && isFlankedByWhitespace('right', node, options)) edges.trailing = edges.trailingNonAscii;
      return { leading: edges.leading, trailing: edges.trailing };
    }
    function edgeWhitespace(string) {
      var m = string.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
      return { leading: m[1], leadingAscii: m[2], leadingNonAscii: m[3], trailing: m[4], trailingNonAscii: m[5], trailingAscii: m[6] };
    }
    function isFlankedByWhitespace(side, node, options) {
      var sibling, regExp, isFlanked;
      if (side === 'left') { sibling = node.previousSibling; regExp = / $/; }
      else { sibling = node.nextSibling; regExp = /^ /; }
      if (sibling) {
        if (sibling.nodeType === 3) isFlanked = regExp.test(sibling.nodeValue);
        else if (options.preformattedCode && sibling.nodeName === 'CODE') isFlanked = false;
        else if (sibling.nodeType === 1 && !isBlock(sibling)) isFlanked = regExp.test(sibling.textContent);
      }
      return isFlanked;
    }

    var reduce = Array.prototype.reduce;
    function TurndownService(options) {
      if (!(this instanceof TurndownService)) return new TurndownService(options);
      var defaults = {
        rules: rules, headingStyle: 'setext', hr: '* * *', bulletListMarker: '*',
        codeBlockStyle: 'indented', fence: '```', emDelimiter: '_', strongDelimiter: '**',
        linkStyle: 'inlined', linkReferenceStyle: 'full', br: '  ', preformattedCode: false,
        blankReplacement: function (c, node) { return node.isBlock ? '\n\n' : ''; },
        keepReplacement: function (c, node) { return node.isBlock ? '\n\n' + node.outerHTML + '\n\n' : node.outerHTML; },
        defaultReplacement: function (c, node) { return node.isBlock ? '\n\n' + c + '\n\n' : c; }
      };
      this.options = extend({}, defaults, options);
      this.rules = new Rules(this.options);
    }
    TurndownService.prototype = {
      turndown: function (input) {
        if (!canConvert(input)) throw new TypeError(input + ' is not a string, or an element/document/fragment node.');
        if (input === '') return '';
        return postProcess.call(this, process.call(this, new RootNode(input, this.options)));
      },
      use: function (plugin) {
        if (Array.isArray(plugin)) { for (var i = 0; i < plugin.length; i++) this.use(plugin[i]); }
        else if (typeof plugin === 'function') plugin(this);
        else throw new TypeError('plugin must be a Function or an Array of Functions');
        return this;
      },
      addRule: function (key, rule) { this.rules.add(key, rule); return this; },
      keep: function (filter) { this.rules.keep(filter); return this; },
      remove: function (filter) { this.rules.remove(filter); return this; },
      escape: function (string) { return escapeMarkdown(string); }
    };

    function process(parentNode) {
      var self = this;
      return reduce.call(parentNode.childNodes, function (output, node) {
        node = new Node(node, self.options);
        var replacement = '';
        if (node.nodeType === 3) replacement = node.isCode ? node.nodeValue : self.escape(node.nodeValue);
        else if (node.nodeType === 1) replacement = replacementForNode.call(self, node);
        return join(output, replacement);
      }, '');
    }
    function postProcess(output) {
      var self = this;
      this.rules.forEach(function (rule) { if (typeof rule.append === 'function') output = join(output, rule.append(self.options)); });
      return output.replace(/^[\t\r\n]+/, '').replace(/[\t\r\n\s]+$/, '');
    }
    function replacementForNode(node) {
      var rule = this.rules.forNode(node);
      var content = process.call(this, node);
      var whitespace = node.flankingWhitespace;
      if (whitespace.leading || whitespace.trailing) content = content.trim();
      return whitespace.leading + rule.replacement(content, node, this.options) + whitespace.trailing;
    }
    function join(output, replacement) {
      var s1 = trimTrailingNewlines(output), s2 = trimLeadingNewlines(replacement);
      var nls = Math.max(output.length - s1.length, replacement.length - s2.length);
      return s1 + '\n\n'.substring(0, nls) + s2;
    }
    function canConvert(input) {
      return input != null && (typeof input === 'string' || input.nodeType && (input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11));
    }

    return TurndownService;
  })();

  // ── Turndown instance ─────────────────────────────────────────────

  var td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  /* Resolve relative links/images to absolute URLs */
  td.addRule('absLinks', {
    filter: ['a', 'img'],
    replacement: function (content, node) {
      if (node.nodeName === 'IMG') {
        var src = node.getAttribute('src') || '';
        var abs = src.startsWith('http') ? src : new URL(src, window.location.origin).href;
        return '![' + (node.alt || '') + '](' + abs + ')';
      }
      var href = node.getAttribute('href') || '';
      var abs = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
      return '[' + content + '](' + abs + ')';
    }
  });

  // ── Content root (skip nav/footer noise) ─────────────────────────

  var root = (
    document.querySelector('main') ||
    document.querySelector('article') ||
    document.querySelector('[role="main"]') ||
    document.body
  ).cloneNode(true);

  /* Strip noise before converting */
  ['script', 'style', 'noscript', 'nav', 'footer',
   '[hidden]', '[aria-hidden="true"]']
    .forEach(function (sel) {
      root.querySelectorAll(sel).forEach(function (el) { el.remove(); });
    });

  // ── YAML front-matter ─────────────────────────────────────────────

  var meta = {
    title:  document.title,
    url:    window.location.href,
    date:   new Date().toISOString(),
    author: (document.querySelector('meta[name="author"]') || {}).content || 'Unknown',
  };
  var yaml = '---\n' +
    Object.keys(meta).map(function (k) { return k + ': "' + meta[k] + '"'; }).join('\n') +
    '\n---\n\n';

  // ── Toast ─────────────────────────────────────────────────────────

  var toastEl = document.createElement('div');
  Object.assign(toastEl.style, {
    position: 'fixed', bottom: '90px', right: '30px', zIndex: '10000',
    padding: '8px 16px', borderRadius: '20px', fontSize: '13px',
    fontWeight: '500', background: 'rgba(0,0,0,0.75)', color: '#fff',
    opacity: '0', transition: 'opacity 0.2s', pointerEvents: 'none',
  });
  document.body.appendChild(toastEl);

  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    setTimeout(function () { toastEl.style.opacity = '0'; }, ms || 2000);
  }

  // ── Button ────────────────────────────────────────────────────────

  var btn = document.createElement('button');
  btn.id = '__md-export-btn';
  btn.textContent = 'Export MD';
  Object.assign(btn.style, {
    position: 'fixed', bottom: '30px', right: '30px', zIndex: '9999',
    padding: '12px 24px', borderRadius: '25px', border: 'none',
    background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)', cursor: 'pointer',
    fontSize: '15px', fontWeight: '500', transition: 'all 0.2s',
  });
  btn.onmouseenter = function () { btn.style.transform = 'scale(1.04)'; };
  btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; };

  btn.onclick = function () {
    try {
      toast('Exporting\u2026');
      var md = yaml + td.turndown(root);
      var blob = new Blob([md], { type: 'text/markdown' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = document.title.replace(/\s+/g, '-').toLowerCase() + '.md';
      a.click();
      toast('Downloaded! \u2713', 2500);
    } catch (err) {
      toast('Error: ' + err.message, 4000);
      console.error('[MD Export]', err);
    }
  };

  document.body.appendChild(btn);
})();