import React, { useMemo } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
// Import common languages for highlighting
import sql from 'highlight.js/lib/languages/sql';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';
import './styles.css';

// Register languages
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Simple HTML escape function
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// Highlight code with highlight.js
function highlightCode(code: string, lang?: string): string {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang }).value;
    } catch {
      // Fall through to auto-detection
    }
  }
  // Try auto-detection
  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
}

// Configure marked options
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
});

// Custom renderer for code blocks with syntax highlighting
const renderer = new marked.Renderer();

// Custom code block rendering with syntax highlighting
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang || '';
  const highlighted = highlightCode(text, language);
  
  // Special styling for SQL
  const isSql = language.toLowerCase() === 'sql';
  const extraClass = isSql ? 'sql-code-block' : '';
  const langLabel = language ? `<span class="code-lang-label">${language.toUpperCase()}</span>` : '';
  
  return `<div class="markdown-code-block ${extraClass}">${langLabel}<pre><code class="hljs">${highlighted}</code></pre></div>`;
};

// Custom inline code rendering
renderer.codespan = ({ text }: { text: string }) => {
  return `<code class="markdown-inline-code">${escapeHtml(text)}</code>`;
};

// Custom link rendering (open in new tab)
renderer.link = ({ href, title, text }: { href: string; title?: string; text: string }) => {
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
  return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.use({ renderer });

// Basic sanitization to prevent XSS
function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const html = useMemo(() => {
    try {
      const rawHtml = marked.parse(content) as string;
      return sanitizeHtml(rawHtml);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return escapeHtml(content);
    }
  }, [content]);

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
