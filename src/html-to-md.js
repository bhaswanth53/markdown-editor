/**
 * Convert an HTML string to Markdown.
 * Used when the consumer calls loadValue() with HTML, or when pasting HTML.
 */
export function htmlToMarkdown(html) {
  if (!html) return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');

  function walk(node, depth = 0) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';

    const tag = node.tagName.toLowerCase();
    const children = () =>
      Array.from(node.childNodes)
        .map((n) => walk(n, depth))
        .join('');

    switch (tag) {
      case 'h1': return `# ${children().trim()}\n`;
      case 'h2': return `## ${children().trim()}\n`;
      case 'h3': return `### ${children().trim()}\n`;
      case 'h4': return `#### ${children().trim()}\n`;
      case 'h5': return `##### ${children().trim()}\n`;
      case 'h6': return `###### ${children().trim()}\n`;
      case 'p': {
        const c = children().trim();
        return c ? `${c}\n` : '';
      }
      case 'strong':
      case 'b': return `**${children()}**`;
      case 'em':
      case 'i': return `*${children()}*`;
      case 'del':
      case 's': return `~~${children()}~~`;
      case 'a': return `[${children()}](${node.getAttribute('href') || ''})`;
      case 'img': return `![${node.getAttribute('alt') || ''}](${node.getAttribute('src') || ''})`;
      case 'br': return '\n';
      case 'hr': return '---\n';
      case 'blockquote':
        return (
          children()
            .trim()
            .split('\n')
            .map((l) => `> ${l}`)
            .join('\n') + '\n'
        );
      case 'code': {
        const inPre =
          node.parentElement &&
          node.parentElement.tagName.toLowerCase() === 'pre';
        return inPre ? node.textContent : `\`${node.textContent}\``;
      }
      case 'pre': {
        const codeEl = node.querySelector('code');
        const match = codeEl && codeEl.className.match(/language-(\w+)/);
        const lang = match ? match[1] : '';
        const code = (codeEl ? codeEl.textContent : node.textContent).replace(
          /\n$/,
          ''
        );
        return `\`\`\`${lang}\n${code}\n\`\`\`\n`;
      }
      case 'ul':
        return (
          Array.from(node.children)
            .map((li) => `- ${walk(li, depth + 1).trim()}`)
            .join('\n') + '\n'
        );
      case 'ol':
        return (
          Array.from(node.children)
            .map((li, i) => `${i + 1}. ${walk(li, depth + 1).trim()}`)
            .join('\n') + '\n'
        );
      case 'li': return children().trim();
      case 'table': {
        const rows = Array.from(node.querySelectorAll('tr'));
        if (!rows.length) return '';
        const heads = Array.from(rows[0].querySelectorAll('th,td')).map((c) =>
          c.textContent.trim()
        );
        let md =
          `| ${heads.join(' | ')} |\n` +
          `| ${heads.map(() => '---').join(' | ')} |\n`;
        rows.slice(1).forEach((r) => {
          md +=
            '| ' +
            Array.from(r.querySelectorAll('td'))
              .map((c) => c.textContent.trim())
              .join(' | ') +
            ' |\n';
        });
        return md;
      }
      default: return children();
    }
  }

  return walk(doc.body).replace(/\n{3,}/g, '\n\n').trim();
}
