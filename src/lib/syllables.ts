const CJK = /[぀-ヿ㐀-鿿가-힯]/gu;

/**
 * Estimate sung syllables in a word. Heuristic: vowel groups for Latin script
 * (with common silent-e handling), one per character for CJK/kana/hangul, and
 * a length-based guess for other scripts.
 */
export function countSyllables(word: string): number {
  const cjk = word.match(CJK);
  if (cjk) return cjk.length;

  const latin = word
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (latin) {
    if (latin.length <= 3) return 1;
    const trimmed = latin
      .replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, (m) => m[0]) // silent endings: makes, liked, love
      .replace(/^y/, '');
    const groups = trimmed.match(/[aeiouy]+/g);
    return Math.max(1, groups?.length ?? 1);
  }

  const letters = Array.from(word.replace(/[\s\p{P}]/gu, ''));
  return letters.length ? Math.max(1, Math.round(letters.length / 2)) : 0;
}
