import './style.css'

// Main editor class
export { MarkdownEditor } from './MarkdownEditor.js';

// Utility exports — useful if consumers want to extend the editor
export { htmlToMarkdown }  from './html-to-md.js';
export { markdownToHtml, highlight } from './md-to-html.js';
export { renderLine, editLine, lineType, inlineRender } from './line-renderer.js';
export { makeCodeBlock }   from './code-block.js';

// CSS must be imported separately in your bundler:
//   import '@your-scope/markdown-editor/style.css'
// or via the dist path:
//   import '@your-scope/markdown-editor/dist/style.css'
