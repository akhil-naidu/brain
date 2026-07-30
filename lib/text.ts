/**
 * Grapheme-aware string helpers.
 *
 * User-visible "characters" are grapheme clusters, not UTF-16 code units or code
 * points: a flag emoji is 4 code units, and a family emoji or a combining accent
 * is several code points. Counting or slicing with `String.length` / `slice` can
 * therefore both misreport length and split a cluster into replacement junk.
 *
 * The locale is pinned so counts and truncation are identical on every machine.
 */
const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export function countGraphemes(value: string): number {
  const segments = graphemeSegmenter.segment(value)[Symbol.iterator]();
  let count = 0;

  while (!segments.next().done) {
    count += 1;
  }

  return count;
}

/** Truncates to at most `maxGraphemes` clusters without splitting a cluster. */
export function truncateGraphemes(value: string, maxGraphemes: number): string {
  if (maxGraphemes <= 0) {
    return "";
  }

  let count = 0;

  for (const segment of graphemeSegmenter.segment(value)) {
    count += 1;

    if (count > maxGraphemes) {
      return value.slice(0, segment.index);
    }
  }

  return value;
}
