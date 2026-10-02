import React from 'react';

/** Renders **bold** segments inside lesson text. */
export function renderRich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
  part.startsWith('**') && part.endsWith('**') && part.length > 4 ?
  <strong key={i} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong> :

  <React.Fragment key={i}>{part}</React.Fragment>

  );
}

export function readMinutes(words: number) {
  return Math.max(1, Math.round(words / 180));
}

export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}