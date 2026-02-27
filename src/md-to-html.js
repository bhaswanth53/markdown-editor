import { marked } from 'marked';
import hljs from 'highlight.js';
import { esc } from './utils.js';

/** Syntax-highlight a code string. Falls back to escaped plain text. */
export function highlight(lang, code) {
  const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  try {
    return validLang !== 'plaintext'
      ? hljs.highlight(code, { language: validLang }).value
      : esc(code);
  } catch {
    return esc(code);
  }
}

/**
 * Convert a Markdown string to output HTML.
 * Code blocks are wrapped in a styled dark container with a language label.
 * Used for getValue() and the Source/Preview pane.
 */
export function markdownToHtml(md) {
  if (!md) return '';

  const renderer = new marked.Renderer();

  renderer.code = (code, lang) => {
    const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = highlight(lang, code);
    return (
      `<div class="prv-cb">` +
        `<div class="prv-cb-h"><span>${esc(validLang)}</span></div>` +
        `<pre><code class="hljs language-${esc(validLang)}">${highlighted}</code></pre>` +
      `</div>`
    );
  };

  renderer.link = (href, title, text) =>
    `<a href="${href}"${title ? ` title="${esc(title)}"` : ''} target="_blank" rel="noopener">${text}</a>`;

  renderer.image = (href, title, alt) =>
    `<img src="${href}"${alt ? ` alt="${esc(alt)}"` : ''} loading="lazy">`;

  try {
    marked.setOptions({
      renderer,
      gfm: true,
      breaks: true,
      headerIds: false,
      mangle: false,
    });
    return marked.parse(md);
  } catch {
    return `<p>${esc(md)}</p>`;
  }
}
