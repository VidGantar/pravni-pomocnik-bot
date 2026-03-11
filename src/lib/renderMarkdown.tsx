import React from 'react';

/**
 * Renders basic markdown: **bold**, *italic*, `code`, and newlines.
 * Returns React nodes suitable for inline rendering.
 */
export const renderMarkdown = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) result.push(<br key={`br-${lineIdx}`} />);

    // Process inline markdown: **bold**, *italic*, `code`
    const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;

    while ((match = inlineRegex.exec(line)) !== null) {
      if (match.index > lastIdx) {
        parts.push(line.slice(lastIdx, match.index));
      }

      if (match[2]) {
        // **bold**
        parts.push(<strong key={`${lineIdx}-b-${match.index}`} className="font-semibold">{match[2]}</strong>);
      } else if (match[3]) {
        // *italic*
        parts.push(<em key={`${lineIdx}-i-${match.index}`}>{match[3]}</em>);
      } else if (match[4]) {
        // `code`
        parts.push(
          <code key={`${lineIdx}-c-${match.index}`} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
            {match[4]}
          </code>
        );
      }

      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < line.length) {
      parts.push(line.slice(lastIdx));
    }

    if (parts.length === 0) {
      parts.push(line);
    }

    result.push(<React.Fragment key={`line-${lineIdx}`}>{parts}</React.Fragment>);
  });

  return result;
};
