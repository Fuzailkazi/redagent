/**
 * Minimal, dependency-free markdown renderer. Handles the subset our reference
 * docs use: # ## ### headings, - lists, 1. ordered lists, ```code fences```,
 * `inline code`, **bold**, [links](url), tables, and paragraphs. Good enough to
 * render the references/*.md beautifully; not a general CommonMark engine.
 */
import { type ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/;
  while (rest.length) {
    const m = rest.match(pattern);
    if (!m || m.index === undefined) {
      nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    const tok = m[0];
    if (tok.startsWith('**'))
      nodes.push(
        <strong key={key++} className="text-aq-ink font-semibold">
          {tok.slice(2, -2)}
        </strong>
      );
    else if (tok.startsWith('`'))
      nodes.push(
        <code
          key={key++}
          className="rounded-aq-xs bg-aq-zebra text-aq-xs text-aq-accent-deep px-1 py-0.5 font-mono"
        >
          {tok.slice(1, -1)}
        </code>
      );
    else {
      const lm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      nodes.push(
        <a key={key++} href={lm[2]} className="text-aq-accent-deep hover:text-aq-accent underline">
          {lm[1]}
        </a>
      );
    }
    rest = rest.slice(m.index + tok.length);
  }
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // code fence
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(
        <pre
          key={key++}
          className="border-aq-border bg-aq-zebra text-aq-xs text-aq-ink-soft my-4 overflow-x-auto rounded-lg border p-3 leading-relaxed"
        >
          <code className="font-mono" data-lang={lang}>
            {buf.join('\n')}
          </code>
        </pre>
      );
      continue;
    }

    // headings
    if (/^#{1,4}\s/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s/, '');
      const cls =
        level === 1
          ? 'text-aq-display font-semibold tracking-aq-tight text-aq-ink mt-2 mb-3'
          : level === 2
            ? 'text-aq-stat font-semibold tracking-aq-tight text-aq-ink mt-8 mb-2'
            : 'text-aq-md font-semibold text-aq-ink mt-5 mb-1.5';
      const Tag = `h${level}` as 'h1';
      out.push(
        <Tag key={key++} className={cls}>
          {inline(text)}
        </Tag>
      );
      i++;
      continue;
    }

    // table
    if (line.includes('|') && lines[i + 1]?.includes('---')) {
      const header = line
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(
          lines[i]
            .split('|')
            .map((s) => s.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length)
        );
        i++;
      }
      out.push(
        <div key={key++} className="border-aq-border my-4 overflow-x-auto rounded-lg border">
          <table className="text-aq-sm w-full border-collapse text-left">
            <thead>
              <tr className="border-aq-border bg-aq-zebra text-aq-caption tracking-aq-wide text-aq-ink-faint border-b uppercase">
                {header.map((h, hi) => (
                  <th key={hi} className="px-3 py-2 font-semibold">
                    {inline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-aq-border border-b align-top last:border-0">
                  {r.map((cell, ci) => (
                    <td key={ci} className="text-aq-ink-soft px-3 py-2">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s/, ''));
        i++;
      }
      out.push(
        <ul key={key++} className="text-aq-sm text-aq-ink-soft my-3 ml-5 list-disc space-y-1">
          {items.map((it, ii) => (
            <li key={ii}>{inline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, ''));
        i++;
      }
      out.push(
        <ol key={key++} className="text-aq-sm text-aq-ink-soft my-3 ml-5 list-decimal space-y-1">
          {items.map((it, ii) => (
            <li key={ii}>{inline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // blank
    if (!line.trim()) {
      i++;
      continue;
    }

    // paragraph (gather until blank)
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^\s*[-*]\s/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i]) &&
      !lines[i].startsWith('```')
    ) {
      buf.push(lines[i++]);
    }
    out.push(
      <p key={key++} className="text-aq-sm text-aq-ink-soft my-3 max-w-2xl leading-relaxed">
        {inline(buf.join(' '))}
      </p>
    );
  }

  return <div className="ds-prose">{out}</div>;
}
