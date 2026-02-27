# markdown-editor

Obsidian-style live markdown editor. Click any line to edit its raw markdown inline; click away to render it. Code blocks always stay styled and are edited directly inside the block.

## Features

- **Live per-line editing** — each line flips between rendered HTML and raw markdown on focus/blur
- **Always-editable code blocks** — click inside any code block to type directly; it stays dark and styled at all times
- **Toolbar** — headings, bold, italic, strikethrough, links, images, inline code, code blocks, blockquotes, lists, tables, dividers
- **Three view modes** — Live Preview · Source+Preview split · Read-only Preview
- **Keyboard shortcuts** — `Ctrl+B`, `Ctrl+I`, `Ctrl+Z`/`Y`, `Ctrl+S`, `/` slash menu, `Tab` indent in code
- **Image paste & drag-drop** — images become base64 data-URIs inline
- **Undo/redo** history (150 steps)
- **Auto-save** event (debounced 2 s)
- Accepts **HTML or Markdown** as input — auto-detected
- Zero framework dependencies

## Install

```bash
npm install @your-scope/markdown-editor
```

> Peer dependencies — install these alongside the editor:
> ```bash
> npm install highlight.js marked
> ```

## Quick start

```js
import { MarkdownEditor } from '@your-scope/markdown-editor';
import '@your-scope/markdown-editor/dist/style.css';

const editor = new MarkdownEditor('#my-div', {
  placeholder:   'Start writing…',
  initialValue:  '<p>Hello <strong>world</strong></p>', // HTML or Markdown
});
editor.init();

// Events
editor.on('change',   (html, md) => console.log(html));
editor.on('save',     (html, md) => fetch('/save', { method: 'POST', body: html }));
editor.on('autosave', (html, md) => localStorage.setItem('draft', md));

// API
editor.getValue();      // → HTML string  (for storing in a database)
editor.getMarkdown();   // → Markdown string
editor.loadValue(str);  // load new HTML or Markdown
editor.clear();
editor.focus();
editor.destroy();
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `'Start writing…'` | Placeholder shown when editor is empty |
| `initialValue` | `string` | `''` | Initial content — HTML or Markdown |
| `bindTo` | `string` | `undefined` | CSS selector of a hidden `<input>` to keep in sync with HTML output |

## Events

| Event | Callback signature | When |
|---|---|---|
| `change` | `(html: string, md: string)` | Every edit |
| `save` | `(html: string, md: string)` | `Ctrl+S` |
| `autosave` | `(html: string, md: string)` | 2 s after last change |

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save |
| `/` on empty line | Slash insert menu |
| `Tab` (inside code block) | Indent 2 spaces |
| `↑` / `↓` (at line edge) | Navigate between lines / code blocks |
| `Enter` | New line (continues list/blockquote prefix) |
| `Escape` | Blur current line |

## Styling

All CSS custom properties are prefixed with `--mde-`. Override them in your stylesheet:

```css
:root {
  --mde-surface:   #ffffff;
  --mde-accent:    #7c3aed;
  --mde-font-body: 'Georgia', serif;
  --mde-font-mono: 'Fira Code', monospace;
}
```

For syntax highlighting themes, import any [highlight.js theme](https://highlightjs.org/demo):

```js
import 'highlight.js/styles/github-dark.css';
```

## Dev

```bash
npm install
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # outputs dist/markdown-editor.es.js + dist/markdown-editor.umd.js + dist/style.css
```

## Module structure

```
src/
  index.js           ← package entry point (re-exports everything)
  MarkdownEditor.js  ← main editor class
  code-block.js      ← self-contained editable code block element
  line-renderer.js   ← per-line render / edit helpers
  md-to-html.js      ← markdown → output HTML (marked + hljs)
  html-to-md.js      ← HTML DOM → markdown (for paste / loadValue)
  toolbar.js         ← toolbar HTML builder
  utils.js           ← esc(), uid(), isHtml()
  style.css          ← all component styles
```

## License

MIT
