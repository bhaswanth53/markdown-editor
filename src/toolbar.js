/** All toolbar SVG icon paths */
const ICONS = {
  bold:      `<svg viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 010 8H6z"/><path d="M6 12h9a4 4 0 010 8H6z"/></svg>`,
  italic:    `<svg viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  strike:    `<svg viewBox="0 0 24 24"><path d="M16 4H9a3 3 0 000 6h6a3 3 0 010 6H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,
  link:      `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
  image:     `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`,
  inlinecode:`<svg viewBox="0 0 24 24"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>`,
  codeblock: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><path d="M9 16l-2-2 2-2"/><path d="M15 12l2 2-2 2"/></svg>`,
  quote:     `<svg viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>`,
  ul:        `<svg viewBox="0 0 24 24"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  ol:        `<svg viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
  table:     `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`,
  hr:        `<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  undo:      `<svg viewBox="0 0 24 24"><polyline points="9,14 4,9 9,4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></svg>`,
  redo:      `<svg viewBox="0 0 24 24"><polyline points="15,14 20,9 15,4"/><path d="M4 20v-7a4 4 0 014-4h12"/></svg>`,
};

const iconBtn   = (cmd, icon, tip) =>
  `<button class="mde-btn" data-c="${cmd}" title="${tip}">${ICONS[icon]}</button>`;
const labelBtn  = (cmd, label, tip) =>
  `<button class="mde-btn mde-lbl" data-c="${cmd}" title="${tip}">${label}</button>`;
const separator = () => `<div class="mde-sep"></div>`;
const group     = (...btns) => `<div class="mde-grp">${btns.join('')}</div>`;

/** Build the full toolbar HTML string */
export function buildToolbarHtml() {
  return (
    `<div class="mde-bar">` +
      group(
        labelBtn('h1', 'H1', 'Heading 1'),
        labelBtn('h2', 'H2', 'Heading 2'),
        labelBtn('h3', 'H3', 'Heading 3'),
      ) +
      separator() +
      group(
        iconBtn('bold',   'bold',   'Bold (Ctrl+B)'),
        iconBtn('italic', 'italic', 'Italic (Ctrl+I)'),
        iconBtn('strike', 'strike', 'Strikethrough'),
      ) +
      separator() +
      group(
        iconBtn('link',       'link',       'Link'),
        iconBtn('image',      'image',      'Image'),
        iconBtn('inlinecode', 'inlinecode', 'Inline Code'),
        iconBtn('codeblock',  'codeblock',  'Code Block'),
      ) +
      separator() +
      group(
        iconBtn('quote', 'quote', 'Blockquote'),
        iconBtn('ul',    'ul',    'Bullet List'),
        iconBtn('ol',    'ol',    'Numbered List'),
        iconBtn('table', 'table', 'Table'),
        iconBtn('hr',    'hr',    'Divider'),
      ) +
      separator() +
      group(
        iconBtn('undo', 'undo', 'Undo (Ctrl+Z)'),
        iconBtn('redo', 'redo', 'Redo (Ctrl+Y)'),
      ) +
      `<div class="mde-pill">` +
        `<button class="mde-pb on" data-mode="live">Live</button>` +
        `<button class="mde-pb" data-mode="source">Source</button>` +
        `<button class="mde-pb" data-mode="preview">Preview</button>` +
      `</div>` +
    `</div>`
  );
}
