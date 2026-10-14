'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeMathDelimiters } from '../lib/markdown-math';

interface MarkdownProps {
  children: string;
  className?: string;
  /** Render without block wrappers, e.g. inside a button or a heading. */
  inline?: boolean;
}

const linkComponent: Components['a'] = ({ node: _node, ...props }) => (
  <a {...props} target="_blank" rel="noopener noreferrer" />
);

const blockComponents: Components = { a: linkComponent };
const inlineComponents: Components = {
  a: linkComponent,
  p: ({ children }) => <>{children}</>,
};

/**
 * Markdown for model-generated text: GFM (tables, lists) plus KaTeX math.
 * Raw HTML is not rendered (react-markdown escapes it), so model output can't
 * inject markup.
 */
export function Markdown({ children, className = '', inline = false }: MarkdownProps) {
  const Wrapper = inline ? 'span' : 'div';
  return (
    <Wrapper className={`markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={inline ? inlineComponents : blockComponents}
      >
        {normalizeMathDelimiters(children)}
      </ReactMarkdown>
    </Wrapper>
  );
}
