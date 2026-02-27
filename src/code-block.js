import { esc } from './utils.js';

/**
 * Build a self-contained editable code block DOM element.
 *
 * Structure:
 *   .cb
 *     .cb-head  — language label + Copy button (non-editable)
 *     .cb-ta    — <textarea>  styled as dark code block, always editable
 *
 * The textarea IS the editor — dark background, monospace, auto-grows.
 * No transparency tricks, no overlay. Click anywhere in the body to focus.
 *
 * @param {string} lang     — language identifier (e.g. 'javascript')
 * @param {string} code     — initial code text
 * @param {object} editor   — MarkdownEditor instance (for _deferSync, _save, _prevLn, _nextLn, _focusLn)
 * @returns {HTMLElement}
 */
export function makeCodeBlock(lang, code, editor) {
  const block = document.createElement('div');
  block.className = 'cb';
  block.dataset.cb = '1';
  block.dataset.lang = lang || '';
  block.dataset.code = code;

  block.innerHTML =
    `<div class="cb-head">` +
      `<span class="cb-lang">${esc(lang || 'code')}</span>` +
      `<button class="cb-copy" tabindex="-1">Copy</button>` +
    `</div>` +
    `<textarea class="cb-ta" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off"></textarea>`;

  const ta      = block.querySelector('.cb-ta');
  const copyBtn = block.querySelector('.cb-copy');

  // Set initial value
  ta.value = code;

  // Auto-grow: expand textarea to fit content without a scrollbar
  function grow() {
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }
  // Needs to run after the element is in the DOM, so defer one frame
  requestAnimationFrame(grow);

  // ── Input ──────────────────────────────────────────────────────────
  ta.addEventListener('input', () => {
    grow();
    block.dataset.code = ta.value;
    editor._deferSync();
  });

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  ta.addEventListener('keydown', (e) => {
    // Tab → insert two spaces (preserve indentation)
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
      grow();
      block.dataset.code = ta.value;
      editor._deferSync();
      return;
    }

    // Ctrl/Cmd+S → save
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      editor._save();
      return;
    }

    // Arrow Up at the very start → jump to previous line
    if (e.key === 'ArrowUp' && ta.selectionStart === 0) {
      e.preventDefault();
      e.stopPropagation();
      const prev = editor._prevLn(block);
      if (prev) editor._focusLn(prev, false);
      return;
    }

    // Arrow Down at the very end → jump to next line
    if (e.key === 'ArrowDown' && ta.selectionStart === ta.value.length) {
      e.preventDefault();
      e.stopPropagation();
      const next = editor._nextLn(block);
      if (next) editor._focusLn(next, true);
      return;
    }
  });

  // ── Blur: persist code value ───────────────────────────────────────
  ta.addEventListener('blur', () => {
    block.dataset.code = ta.value;
    editor._deferSync();
  });

  // ── Click on wrapper → focus textarea ─────────────────────────────
  block.addEventListener('click', (e) => {
    e.stopPropagation();
    // Clicks on the header (copy btn, lang label) don't focus the editor
    if (e.target.closest('.cb-head')) return;
    ta.focus();
  });

  // ── Copy button ────────────────────────────────────────────────────
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = ta.value;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✓ Copied';
        setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
      });
    } else {
      // Fallback for older browsers
      const tmp = document.createElement('textarea');
      tmp.value = text;
      tmp.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
      copyBtn.textContent = '✓ Copied';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
    }
  });

  return block;
}
