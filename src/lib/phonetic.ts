/**
 * A small Metaphone-style phonetic key: words that sound alike map to similar
 * keys ("ground"/"grand" → "krnt"). Tuned for English; other Latin-script
 * languages still benefit from the consonant skeleton.
 */
export function phoneticKey(word: string): string {
  let w = word
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (!w) return '';

  // Silent or simplified starts
  w = w.replace(/^(kn|gn|pn|wr|ps)/, (m) => m[1]).replace(/^x/, 's').replace(/^wh/, 'w');

  const rules: [RegExp, string][] = [
    [/ph/g, 'f'],
    [/gh(?=[^aeiou]|$)/g, ''], // night, though
    [/ck/g, 'k'],
    [/sch/g, 'sk'],
    [/(t|s)h/g, '0'], // th / sh as one sound
    [/ch/g, 'x'],
    [/tio|tia/g, 'xo'],
    [/c(?=[iey])/g, 's'],
    [/c|q/g, 'k'],
    [/dg(?=[iey])/g, 'j'],
    [/g(?=[iey])/g, 'j'],
    [/d/g, 't'],
    [/nts/g, 'ns'], // "cents" ≈ "sense"
    [/b/g, 'p'],
    [/v/g, 'f'],
    [/z/g, 's'],
    [/x/g, 'ks'],
    [/mb$/g, 'm'],
    [/(?<=.)[aeiouyhw]/g, ''], // drop non-initial vowels and weak consonants
    [/^[aeiouy]/, 'a'], // all initial vowels sound alike enough
  ];
  for (const [re, rep] of rules) w = w.replace(re, rep);
  return w.replace(/(.)\1+/g, '$1');
}
