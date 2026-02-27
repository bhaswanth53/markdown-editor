import { esc } from './utils.js';

/**
 * Classify a raw markdown text line into a semantic type.
 * @param {string} text
 * @returns {string}
 */
export function lineType(text) {
  if (/^#{6} /.test(text)) return 'h6';
  if (/^#{5} /.test(text)) return 'h5';
  if (/^#{4} /.test(text)) return 'h4';
  if (/^#{3} /.test(text)) return 'h3';
  if (/^#{2} /.test(text)) return 'h2';
  if (/^# /.test(text))    return 'h1';
  if (/^(---+|\*\*\*+)\s*$/.test(text)) return 'hr';
  if (/^> ?/.test(text))    return 'bq';
  if (/^[-*+] /.test(text)) return 'ul';
  if (/^\d+\. /.test(text)) return 'ol';
  if (text.trim() === '')    return 'empty';
  return 'p';
}

/**
 * Convert inline markdown syntax to HTML spans.
 * Only used for the live-preview render of non-code lines.
 */
export function inlineRender(raw) {
  let s = esc(raw);
  // inline code (protect first)
  s = s.replace(/`([^`\n]+)`/g, '<span class="ic">$1</span>');
  // bold+italic
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // italic
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  // strikethrough
  s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // images (before links)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  // links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

/**
 * Render a text line element in its blurred (preview) state.
 * Sets className, contentEditable=false, and innerHTML.
 */
export function renderLine(el, text) {
  const t = lineType(text);
  el.className = `ln ${t}`;
  el.contentEditable = 'false';
  el.removeAttribute('style');

  switch (t) {
    case 'h1': case 'h2': case 'h3':
    case 'h4': case 'h5': case 'h6':
      el.innerHTML = inlineRender(text.replace(/^#+\s/, '')) || '<br>';
      break;
    case 'hr':
      el.textContent = '';
      break;
    case 'bq':
      el.innerHTML = inlineRender(text.replace(/^> ?/, '')) || '<br>';
      break;
    case 'ul':
      el.innerHTML = '• ' + inlineRender(text.replace(/^[-*+] /, ''));
      break;
    case 'ol': {
      const m = text.match(/^(\d+)\. (.*)/);
      el.innerHTML = (m ? `${m[1]}. ` : '') + inlineRender(m ? m[2] : text);
      break;
    }
    case 'empty':
      el.innerHTML = '<br>';
      break;
    default:
      el.innerHTML = inlineRender(text) || '<br>';
  }
}

/**
 * Switch a text line element into raw editing mode.
 * Shows the underlying markdown source in a monospace font.
 */
export function editLine(el, text) {
  el.className = 'ln is-ed';
  el.contentEditable = 'true';
  el.textContent = text;
}
