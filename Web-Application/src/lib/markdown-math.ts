/**
 * remark-math only understands $...$ and $$...$$, but LLMs often write LaTeX
 * as \(...\) and \[...\]. Convert those, leaving fenced/inline code untouched.
 */
export function normalizeMathDelimiters(markdown: string): string {
  // Split on code spans/blocks so their contents are never rewritten.
  const parts = markdown.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // code
      return part
        .replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => `\n$$\n${expr.trim()}\n$$\n`)
        .replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => `$${expr.trim()}$`);
    })
    .join('');
}
