import { uid, isHtml } from './utils.js';
import { htmlToMarkdown } from './html-to-md.js';
import { markdownToHtml } from './md-to-html.js';
import { renderLine, editLine, lineType } from './line-renderer.js';
import { makeCodeBlock } from './code-block.js';
import { buildToolbarHtml } from './toolbar.js';

/**
 * Obsidian-style live markdown editor.
 *
 * Usage:
 *   import { MarkdownEditor } from '@your-scope/markdown-editor';
 *   import '@your-scope/markdown-editor/style.css';
 *
 *   const editor = new MarkdownEditor('#my-div', {
 *     placeholder: 'Start writing…',
 *     initialValue: '<p>Hello <strong>world</strong></p>',  // HTML or Markdown
 *   });
 *   editor.init();
 *
 *   editor.on('change', (html, md) => { ... });
 *   editor.on('save',   (html, md) => { ... });   // Ctrl+S
 *   editor.on('autosave', (html, md) => { ... }); // debounced 2 s
 *
 *   editor.getValue();      // → HTML string
 *   editor.getMarkdown();   // → Markdown string
 *   editor.loadValue(str);  // load HTML or Markdown
 *   editor.clear();
 *   editor.focus();
 *   editor.destroy();
 */
export class MarkdownEditor {
  constructor(selector, options = {}) {
    this._sel  = selector;
    this._opts = {
      placeholder: 'Start writing… type / for commands',
      initialValue: '',
      ...options,
    };

    this._id   = uid();
    this._el   = null;   // container element
    this._wrap = null;   // editor root element
    this._live = null;   // contenteditable live-edit area

    this._mode  = 'live';
    this._md    = '';

    this._events   = {};
    this._saveTimer = null;
    this._syncTimer = null;

    this._undoStack = [];
    this._redoStack = [];
    this._composing = false;
  }

  // ─── Public API ────────────────────────────────────────────────────

  /** Mount the editor into the DOM. Must be called once after construction. */
  init() {
    this._el =
      typeof this._sel === 'string'
        ? document.querySelector(this._sel)
        : this._sel;

    if (!this._el) {
      console.error('[MarkdownEditor] element not found:', this._sel);
      return this;
    }

    this._buildDOM();
    this._bindEvents();

    if (this._opts.initialValue) {
      this.loadValue(this._opts.initialValue);
    } else {
      this._draw();
    }

    return this;
  }

  /** Subscribe to an event ('change' | 'save' | 'autosave'). */
  on(event, handler) {
    (this._events[event] = this._events[event] || []).push(handler);
    return this;
  }

  /** Unsubscribe a previously registered handler. */
  off(event, handler) {
    if (this._events[event]) {
      this._events[event] = this._events[event].filter((h) => h !== handler);
    }
    return this;
  }

  /** Return the current content as an HTML string suitable for storing in a backend. */
  getValue() {
    return markdownToHtml(this._md);
  }

  /** Return the current content as a raw Markdown string. */
  getMarkdown() {
    return this._md;
  }

  /**
   * Load content into the editor.
   * Accepts either an HTML string or a Markdown string — auto-detected.
   */
  loadValue(value) {
    this._md = (
      !value
        ? ''
        : isHtml(value)
          ? htmlToMarkdown(value)
          : value
    )
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    if (this._live) this._draw();
    this._syncHidden();
    return this;
  }

  /** Clear all content and reset undo history. */
  clear() {
    this._md = '';
    this._undoStack = [];
    this._redoStack = [];
    if (this._live) this._draw();
    this._syncHidden();
    return this;
  }

  /** Move keyboard focus into the editor. */
  focus() {
    if (this._live) this._live.focus();
    return this;
  }

  /** Remove the editor from the DOM and clean up listeners. */
  destroy() {
    if (this._wrap) this._wrap.remove();
    this._events = {};
  }

  // ─── DOM Construction ──────────────────────────────────────────────

  _buildDOM() {
    this._wrap = document.createElement('div');
    this._wrap.className = 'mde';
    this._wrap.id = this._id;

    // Inherit height from container if set
    const containerHeight = this._el.style.height;
    if (containerHeight) {
      this._wrap.style.height = containerHeight;
      this._el.style.height = '';
    }

    this._wrap.innerHTML =
      buildToolbarHtml() +
      `<div class="mde-body">` +
        `<div class="mde-live" data-ph="${this._opts.placeholder}" spellcheck="true" tabindex="0"></div>` +
        `<div class="mde-src-wrap" style="display:none">` +
          `<div class="mde-sp"><textarea class="mde-st" spellcheck="false"></textarea></div>` +
          `<div class="mde-pp rnd"></div>` +
        `</div>` +
        `<div class="mde-pf rnd" style="display:none"></div>` +
        `<div class="phi">📎 Image pasted!</div>` +
        `<div class="smenu"></div>` +
      `</div>` +
      `<div class="mde-st-bar">` +
        `<span class="mde-sm">Live Preview</span>` +
        `<span class="mde-wc">0 words</span>` +
        `<span class="mde-st-r">Ctrl+S to save · / for commands</span>` +
      `</div>`;

    this._el.appendChild(this._wrap);
    this._live = this._wrap.querySelector('.mde-live');
  }

  // ─── Event Binding ─────────────────────────────────────────────────

  _bindEvents() {
    const wrap = this._wrap;
    const live = this._live;

    // Toolbar buttons
    wrap.querySelectorAll('[data-c]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._execCommand(btn.dataset.c);
      });
    });

    // Mode pills
    wrap.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => this._setMode(btn.dataset.mode));
    });

    // Live editor area
    live.addEventListener('click',          (e) => this._onClick(e));
    live.addEventListener('keydown',        (e) => this._onKeydown(e));
    live.addEventListener('input',          ()  => this._onInput());
    live.addEventListener('paste',          (e) => this._onPaste(e));
    live.addEventListener('drop',           (e) => this._onDrop(e));
    live.addEventListener('dragover',       (e) => { e.preventDefault(); live.classList.add('drag-over'); });
    live.addEventListener('dragleave',      ()  => live.classList.remove('drag-over'));
    live.addEventListener('compositionstart', () => { this._composing = true; });
    live.addEventListener('compositionend',   () => { this._composing = false; this._onInput(); });

    // Source textarea (split-view)
    const sourceTA = wrap.querySelector('.mde-st');
    if (sourceTA) {
      sourceTA.addEventListener('input', () => {
        this._md = sourceTA.value;
        this._renderSourcePreview();
        this._emitChange();
      });
      sourceTA.addEventListener('keydown', (e) => {
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this._save(); }
        if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
      });
    }
  }

  // ─── Click ─────────────────────────────────────────────────────────

  _onClick(e) {
    // Code blocks handle their own clicks internally
    if (e.target.closest('.cb')) return;

    let el = e.target;
    while (el && el !== this._live) {
      if (el.classList && el.classList.contains('ln')) break;
      el = el.parentElement;
    }

    if (el && el.classList.contains('ln') && !el.classList.contains('is-ed')) {
      this._focusLine(el);
    } else if (!el || el === this._live) {
      // Clicked empty area — focus the last text line
      const lines = [...this._live.querySelectorAll('.ln')];
      if (lines.length) {
        this._focusLine(lines[lines.length - 1]);
      } else {
        const line = this._makeLine('');
        this._live.appendChild(line);
        this._focusLine(line);
      }
    }
  }

  // ─── Keydown ───────────────────────────────────────────────────────

  _onKeydown(e) {
    // Global shortcuts
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this._save(); return; }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); this._undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); this._redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); this._wrapSelection('**'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); this._wrapSelection('*'); return; }

    const focused = this._live.querySelector('.ln.is-ed');
    if (!focused) return;

    if (e.key === 'Escape')  { this._blurLine(focused); return; }
    if (e.key === 'Tab')     { e.preventDefault(); document.execCommand('insertText', false, '  '); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._handleEnter(focused); return; }
    if (e.key === 'Backspace')   { this._handleBackspace(e, focused); return; }

    if (e.key === 'ArrowUp') {
      const pos = this._caretPos(focused);
      if (pos <= 1) {
        const prev = this._prevLine(focused);
        if (prev) { e.preventDefault(); this._blurLine(focused); this._focusLine(prev, false); }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      const text = focused.textContent;
      const pos  = this._caretPos(focused);
      if (pos >= text.length - 1) {
        const next = this._nextLine(focused);
        if (next) { e.preventDefault(); this._blurLine(focused); this._focusLine(next, true); }
      }
      return;
    }

    // Slash menu trigger
    if (e.key === '/' && focused.textContent.trim() === '') {
      setTimeout(() => this._showSlashMenu(focused), 0);
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────

  _onInput() {
    if (this._composing) return;
    const focused = this._live.querySelector('.ln.is-ed');
    if (!focused) return;
    focused.dataset.md = focused.textContent;
    this._deferSync();
  }

  // ─── Enter key ─────────────────────────────────────────────────────

  _handleEnter(focused) {
    const text = focused.textContent;
    const type = lineType(text);

    // Break out of an empty list item
    if (
      (type === 'ul' || type === 'ol') &&
      text.trim() === text.match(/^([-*+]|\d+\.) /)[0]
    ) {
      this._setText(focused, '');
      const newLine = this._makeLine('');
      this._insertAfter(focused, newLine);
      this._blurLine(focused);
      this._focusLine(newLine);
      this._sync();
      this._emitChange();
      return;
    }

    const pos    = this._caretPos(focused);
    const before = text.slice(0, pos);
    const after  = text.slice(pos);

    // Compute continuation prefix for lists / blockquotes
    let prefix = '';
    if (type === 'ul') prefix = text.match(/^[-*+] /)[0];
    if (type === 'ol') {
      const n = parseInt(text.match(/^\d+/)[0], 10);
      prefix = `${n + 1}. `;
    }
    if (type === 'bq') prefix = text.match(/^> ?/)[0];

    this._setText(focused, before);
    const newLine = this._makeLine(prefix + after);
    this._insertAfter(focused, newLine);
    this._blurLine(focused);
    this._focusLine(newLine);

    // Place caret after the prefix
    const node = newLine.firstChild || newLine;
    const range = document.createRange();
    const sel   = window.getSelection();
    range.setStart(node, Math.min(prefix.length, node.length || 0));
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    this._sync();
    this._emitChange();
  }

  // ─── Backspace ─────────────────────────────────────────────────────

  _handleBackspace(e, focused) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range   = sel.getRangeAt(0);
    const text    = focused.textContent;
    const atStart = range.collapsed && range.startOffset === 0;

    if (atStart && text === '') {
      // Delete empty line
      e.preventDefault();
      const prev = this._prevLine(focused);
      focused.remove();
      this._sync();
      if (prev) {
        this._blurLine(this._live.querySelector('.is-ed'));
        editLine(prev, prev.dataset.md || '');
        prev.focus();
        this._caretEnd(prev);
      }
      this._emitChange();
      return;
    }

    if (atStart && text) {
      // Merge with previous line (but not into a code block)
      const prev = this._prevLine(focused);
      if (prev && !prev.dataset.cb) {
        e.preventDefault();
        const prevMd = prev.dataset.md || '';
        const merged = prevMd + text;
        focused.remove();
        editLine(prev, merged);
        prev.dataset.md = merged;
        prev.focus();

        const node  = prev.firstChild || prev;
        const range2 = document.createRange();
        const sel2   = window.getSelection();
        range2.setStart(node, Math.min(prevMd.length, node.length || 0));
        range2.collapse(true);
        sel2.removeAllRanges();
        sel2.addRange(range2);

        this._sync();
        this._emitChange();
      }
    }
  }

  // ─── Focus / Blur lines ────────────────────────────────────────────

  _focusLine(el, atStart) {
    // Code block: focus its textarea
    if (el.dataset.cb) {
      const ta = el.querySelector('.cb-ta');
      if (ta) {
        ta.focus();
        if (atStart === true) ta.setSelectionRange(0, 0);
        else ta.setSelectionRange(ta.value.length, ta.value.length);
      }
      return;
    }

    // Text line
    const current = this._live.querySelector('.ln.is-ed');
    if (current && current !== el) this._blurLine(current);

    const md = el.dataset.md || '';
    editLine(el, md);
    el.focus();

    const node  = el.firstChild || el;
    const range = document.createRange();
    const sel   = window.getSelection();
    if (atStart === true) range.setStart(node, 0);
    else range.setStart(node, node.length || node.textContent.length || 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  _blurLine(el) {
    if (!el || el.dataset.cb) return;
    const md = el.textContent;
    el.dataset.md = md;
    renderLine(el, md);
  }

  // ─── Navigation helpers ────────────────────────────────────────────

  /** The previous sibling that is a text line or code block. */
  _prevLine(el) {
    let p = el.previousElementSibling;
    while (p && !p.classList.contains('ln') && !p.dataset.cb) {
      p = p.previousElementSibling;
    }
    return p || null;
  }

  /** The next sibling that is a text line or code block. */
  _nextLine(el) {
    let n = el.nextElementSibling;
    while (n && !n.classList.contains('ln') && !n.dataset.cb) {
      n = n.nextElementSibling;
    }
    return n || null;
  }

  // ─── DOM helpers ───────────────────────────────────────────────────

  _makeLine(text) {
    const el = document.createElement('div');
    el.className   = 'ln';
    el.dataset.md  = text;
    renderLine(el, text);
    return el;
  }

  _insertAfter(ref, newEl) {
    if (ref.nextSibling) this._live.insertBefore(newEl, ref.nextSibling);
    else this._live.appendChild(newEl);
  }

  _caretPos(el) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return el.textContent.length;
    const range  = sel.getRangeAt(0).cloneRange();
    const before = document.createRange();
    try {
      before.setStart(el.firstChild || el, 0);
      before.setEnd(range.startContainer, range.startOffset);
    } catch {
      return 0;
    }
    return before.toString().length;
  }

  _caretEnd(el) {
    const node  = el.firstChild || el;
    const range = document.createRange();
    const sel   = window.getSelection();
    range.setStart(node, node.nodeType === 3 ? node.length : node.textContent.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  _setText(el, text) {
    el.textContent = text;
    el.dataset.md  = text;
  }

  // ─── Sync DOM → markdown string ────────────────────────────────────

  _sync() {
    const parts = [];

    this._live.childNodes.forEach((node) => {
      if (node.nodeType !== 1) return;

      if (node.dataset.cb) {
        // Code block: emit fence markers
        const lang = node.dataset.lang || '';
        const code = node.dataset.code || '';
        parts.push('```' + lang);
        code.split('\n').forEach((line) => parts.push(line));
        parts.push('```');
      } else if (node.classList.contains('ln')) {
        if (node.classList.contains('is-ed')) {
          node.dataset.md = node.textContent;
        }
        parts.push(node.dataset.md || '');
      }
    });

    const newMd = parts.join('\n');
    if (newMd !== this._md) {
      this._pushUndo(this._md);
      this._md = newMd;
    }

    this._updateWordCount();
    this._syncHidden();
    this._updatePlaceholder();
  }

  /** Debounced sync — called by code blocks and text input. */
  _deferSync() {
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => {
      this._sync();
      this._emitChange();
    }, 80);
  }

  // ─── Draw DOM from markdown string ─────────────────────────────────

  _draw() {
    this._live.innerHTML = '';

    if (!this._md) {
      this._live.appendChild(this._makeLine(''));
      this._updateWordCount();
      this._updatePlaceholder();
      return;
    }

    const lines = this._md.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line  = lines[i];
      const fence = line.match(/^(`{3,}|~{3,})(.*)/);

      if (fence) {
        const lang      = (fence[2] || '').trim();
        const codeLines = [];
        i++;

        while (i < lines.length) {
          if (/^(`{3,}|~{3,})\s*$/.test(lines[i])) { i++; break; }
          codeLines.push(lines[i]);
          i++;
        }

        this._live.appendChild(makeCodeBlock(lang, codeLines.join('\n'), this));
      } else {
        this._live.appendChild(this._makeLine(line));
        i++;
      }
    }

    this._updateWordCount();
    this._updatePlaceholder();
  }

  // ─── Paste & Drop ──────────────────────────────────────────────────

  _onPaste(e) {
    const cd = e.clipboardData || window.clipboardData;
    const imgItem = Array.from(cd.items || []).find((it) =>
      it.type.startsWith('image/')
    );
    if (imgItem) { e.preventDefault(); this._insertImageFile(imgItem.getAsFile()); return; }

    const html = cd.getData('text/html');
    if (html && isHtml(html)) { e.preventDefault(); this._insertText(htmlToMarkdown(html)); return; }

    const plain = cd.getData('text/plain');
    if (plain && plain.includes('\n')) { e.preventDefault(); this._insertText(plain); }
  }

  _onDrop(e) {
    e.preventDefault();
    this._live.classList.remove('drag-over');
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith('image/')
    );
    if (file) this._insertImageFile(file);
  }

  _insertImageFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      this._insertText(`![${file.name || 'image'}](${ev.target.result})`);
      const hint = this._wrap.querySelector('.phi');
      if (hint) {
        hint.classList.add('show');
        setTimeout(() => hint.classList.remove('show'), 2000);
      }
    };
    reader.readAsDataURL(file);
  }

  _insertText(text) {
    const focused = this._live.querySelector('.ln.is-ed');
    const lines   = text.split('\n');

    if (!focused) {
      lines.forEach((l) => this._live.appendChild(this._makeLine(l)));
      this._sync();
      this._emitChange();
      return;
    }

    if (lines.length === 1) {
      document.execCommand('insertText', false, text);
      focused.dataset.md = focused.textContent;
    } else {
      const pos = this._caretPos(focused);
      const cur = focused.textContent;
      const all = [
        cur.slice(0, pos) + lines[0],
        ...lines.slice(1, -1),
        lines[lines.length - 1] + cur.slice(pos),
      ];
      this._setText(focused, all[0]);
      this._blurLine(focused);
      let ref = focused;
      for (let i = 1; i < all.length; i++) {
        const nl = this._makeLine(all[i]);
        this._insertAfter(ref, nl);
        ref = nl;
      }
      this._focusLine(ref);
    }

    this._sync();
    this._emitChange();
  }

  // ─── Slash menu ────────────────────────────────────────────────────

  _showSlashMenu(line) {
    const menu = this._wrap.querySelector('.smenu');
    const items = [
      { ic: 'H1', label: 'Heading 1',    md: '# '    },
      { ic: 'H2', label: 'Heading 2',    md: '## '   },
      { ic: 'H3', label: 'Heading 3',    md: '### '  },
      { ic: '❝',  label: 'Blockquote',   md: '> '    },
      { ic: '•',  label: 'Bullet List',  md: '- '    },
      { ic: '1.', label: 'Numbered List',md: '1. '   },
      { ic: '—',  label: 'Divider',      md: '---'   },
      { ic: '{}', label: 'Code Block',   md: '```javascript\n\n```' },
      { ic: '▦',  label: 'Table',        md: '| Col 1 | Col 2 |\n| --- | --- |\n| Cell | Cell |' },
    ];

    menu.innerHTML = items
      .map(
        (item, i) =>
          `<div class="si" data-i="${i}">` +
            `<span class="sic">${item.ic}</span>` +
            `<span>${item.label}</span>` +
          `</div>`
      )
      .join('');

    menu.style.display = 'block';
    const rect  = line.getBoundingClientRect();
    const wRect = this._wrap.getBoundingClientRect();
    menu.style.top  = `${rect.bottom - wRect.top + 2}px`;
    menu.style.left = `${rect.left - wRect.left}px`;

    menu.querySelectorAll('.si').forEach((el, idx) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        menu.style.display = 'none';
        const item = items[idx];
        this._setText(line, item.md);
        this._sync();
        if (item.md.includes('\n')) {
          this._draw();
        } else {
          line.focus();
          this._caretEnd(line);
        }
        this._emitChange();
      });
    });

    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.style.display = 'none';
        document.removeEventListener('mousedown', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeMenu), 50);
  }

  // ─── Toolbar commands ──────────────────────────────────────────────

  _execCommand(cmd) {
    if (cmd === 'undo') { this._undo(); return; }
    if (cmd === 'redo') { this._redo(); return; }

    const focused = this._live.querySelector('.ln.is-ed');

    if (!focused) {
      // Nothing focused — append a snippet
      const snippets = {
        h1: '# Heading', h2: '## Heading', h3: '### Heading',
        bold: '**bold**', italic: '*italic*', strike: '~~text~~',
        link: '[text](https://)', image: '![alt](https://)',
        inlinecode: '`code`',
        codeblock:  '```javascript\n// code here\n```',
        quote: '> Blockquote', ul: '- Item', ol: '1. Item',
        table: '| Col 1 | Col 2 |\n| --- | --- |\n| Cell | Cell |',
        hr: '---',
      };
      if (snippets[cmd]) {
        this._md = this._md ? `${this._md}\n${snippets[cmd]}` : snippets[cmd];
        this._draw();
        this._emitChange();
      }
      return;
    }

    const sel      = window.getSelection();
    const selected = sel.rangeCount ? sel.getRangeAt(0).toString() : '';

    switch (cmd) {
      case 'h1': case 'h2': case 'h3': {
        const prefix  = { h1: '# ', h2: '## ', h3: '### ' }[cmd];
        const current = focused.textContent;
        const clean   = current.replace(/^#+\s*/, '');
        this._setText(focused, current.startsWith(prefix) ? clean : prefix + clean);
        this._caretEnd(focused);
        break;
      }
      case 'bold':       this._wrapSelection('**'); break;
      case 'italic':     this._wrapSelection('*');  break;
      case 'strike':     this._wrapSelection('~~'); break;
      case 'inlinecode': this._wrapSelection('`');  break;

      case 'link': {
        const url = prompt('URL:', 'https://');
        if (url) document.execCommand('insertText', false, `[${selected || 'text'}](${url})`);
        break;
      }
      case 'image': {
        const url = prompt('Image URL:', 'https://');
        if (url) document.execCommand('insertText', false, `![${selected || 'alt'}](${url})`);
        break;
      }

      case 'codeblock': {
        const lang = prompt('Language (e.g. javascript, python):', 'javascript') || '';
        this._blurLine(focused);
        const block = makeCodeBlock(lang, '', this);
        this._insertAfter(focused, block);
        this._sync();
        this._emitChange();
        setTimeout(() => {
          const ta = block.querySelector('.cb-ta');
          if (ta) ta.focus();
        }, 0);
        return;
      }

      case 'quote': this._togglePrefix(focused, '> ');  break;
      case 'ul':    this._togglePrefix(focused, '- ');  break;
      case 'ol':    this._togglePrefix(focused, '1. '); break;

      case 'hr': {
        this._blurLine(focused);
        const hrLine = this._makeLine('---');
        this._insertAfter(focused, hrLine);
        this._sync();
        this._emitChange();
        return;
      }

      case 'table': {
        ['| Column 1 | Column 2 |', '| --- | --- |', '| Cell | Cell |'].forEach(
          (row) => this._live.appendChild(this._makeLine(row))
        );
        this._sync();
        this._emitChange();
        return;
      }
    }

    if (focused) focused.dataset.md = focused.textContent;
    this._sync();
    this._emitChange();
  }

  _wrapSelection(marker) {
    const sel      = window.getSelection();
    const selected = sel.rangeCount ? sel.getRangeAt(0).toString() : '';

    if (selected) {
      document.execCommand('insertText', false, `${marker}${selected}${marker}`);
    } else {
      document.execCommand('insertText', false, `${marker}${marker}`);
      // Move caret back inside the markers
      const sel2 = window.getSelection();
      if (sel2.rangeCount) {
        const r = sel2.getRangeAt(0).cloneRange();
        r.setStart(r.startContainer, r.startOffset - marker.length);
        r.collapse(true);
        sel2.removeAllRanges();
        sel2.addRange(r);
      }
    }

    const f = this._live.querySelector('.is-ed');
    if (f) f.dataset.md = f.textContent;
  }

  _togglePrefix(el, prefix) {
    const current = el.textContent;
    const clean   = current.replace(/^#+\s*|^> ?|^[-*+] |\d+\. /, '');
    this._setText(el, current.startsWith(prefix) ? clean : prefix + clean);
    this._caretEnd(el);
  }

  // ─── Undo / Redo ───────────────────────────────────────────────────

  _pushUndo(state) {
    if (!state || state === this._undoStack[this._undoStack.length - 1]) return;
    this._undoStack.push(state);
    if (this._undoStack.length > 150) this._undoStack.shift();
    this._redoStack = [];
  }

  _undo() {
    if (!this._undoStack.length) return;
    this._redoStack.push(this._md);
    this._md = this._undoStack.pop();
    this._draw();
    this._emitChange();
  }

  _redo() {
    if (!this._redoStack.length) return;
    this._undoStack.push(this._md);
    this._md = this._redoStack.pop();
    this._draw();
    this._emitChange();
  }

  // ─── Modes ─────────────────────────────────────────────────────────

  _setMode(mode) {
    this._mode = mode;

    const focused = this._live && this._live.querySelector('.ln.is-ed');
    if (focused) this._blurLine(focused);

    const livePane   = this._wrap.querySelector('.mde-live');
    const sourceWrap = this._wrap.querySelector('.mde-src-wrap');
    const previewFull= this._wrap.querySelector('.mde-pf');

    livePane.style.display    = mode === 'live'    ? '' : 'none';
    if (sourceWrap) sourceWrap.style.display = mode === 'source'  ? 'flex' : 'none';
    if (previewFull) previewFull.style.display = mode === 'preview' ? ''   : 'none';

    this._wrap.querySelectorAll('[data-mode]').forEach((btn) =>
      btn.classList.toggle('on', btn.dataset.mode === mode)
    );

    const modeLabel = this._wrap.querySelector('.mde-sm');
    if (modeLabel) {
      modeLabel.textContent = { live: 'Live Preview', source: 'Source / Preview', preview: 'Read Mode' }[mode] || mode;
    }

    if (mode === 'source') {
      const ta = this._wrap.querySelector('.mde-st');
      if (ta) { ta.value = this._md; this._renderSourcePreview(); }
    }
    if (mode === 'preview') {
      const pv = this._wrap.querySelector('.mde-pf');
      if (pv) pv.innerHTML = markdownToHtml(this._md);
    }
  }

  _renderSourcePreview() {
    const pane = this._wrap.querySelector('.mde-pp');
    if (pane) pane.innerHTML = markdownToHtml(this._md);
  }

  // ─── Misc helpers ──────────────────────────────────────────────────

  _emitChange() {
    const html = this.getValue();
    this._emit('change', html, this._md);
    this._syncHidden();
    this._updateWordCount();
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(
      () => this._emit('autosave', html, this._md),
      2000
    );
  }

  _save() {
    const html = this.getValue();
    this._syncHidden();
    this._emit('save', html, this._md);
    const statusRight = this._wrap.querySelector('.mde-st-r');
    if (statusRight) {
      const original = statusRight.textContent;
      statusRight.innerHTML = '<span class="ok">✓ Saved</span>';
      setTimeout(() => { statusRight.textContent = original; }, 1800);
    }
  }

  _syncHidden() {
    // Support: consumer passes bindTo selector
    if (this._opts.bindTo) {
      const el = document.querySelector(this._opts.bindTo);
      if (el) el.value = this.getValue();
    }
    // Support: auto-bind to a hidden input that immediately follows the container
    const next = this._el.nextElementSibling;
    if (next && (next.type === 'hidden' || next.tagName === 'INPUT')) {
      next.value = this.getValue();
    }
  }

  _updateWordCount() {
    const text = this._md
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#*`>_~[\]!|]/g, ' ')
      .trim();
    const count = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const el = this._wrap && this._wrap.querySelector('.mde-wc');
    if (el) el.textContent = `${count} word${count !== 1 ? 's' : ''}`;
  }

  _updatePlaceholder() {
    const isEmpty =
      this._live.querySelectorAll('.ln, .cb').length === 1 &&
      !this._md.trim();
    this._live.classList.toggle('ph', isEmpty);
  }

  _emit(event, ...args) {
    (this._events[event] || []).forEach((handler) => handler(...args));
  }
}
