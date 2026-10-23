// Rough Devanagari → Roman, so learners can read what the app heard.
const VOWEL = { अ: 'a', आ: 'aa', इ: 'i', ई: 'ee', उ: 'u', ऊ: 'oo', ऋ: 'ri', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au', ऑ: 'o' };
const MATRA = { 'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o' };
const CONS = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'ng', च: 'ch', छ: 'chh', ज: 'j', झ: 'jh', ञ: 'ny',
  ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n', त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm', य: 'y', र: 'r', ल: 'l', व: 'v',
  श: 'sh', ष: 'sh', स: 's', ह: 'h',
};
const NUKTA = { क: 'q', ख: 'kh', ग: 'g', ज: 'z', ड: 'r', ढ: 'rh', फ: 'f' };

export function toRoman(text) {
  return text
    .normalize('NFC')
    .split(/\s+/)
    .map((word) => {
      const ch = [...word];
      const out = [];
      for (let i = 0; i < ch.length; i++) {
        const c = ch[i];
        if (CONS[c]) {
          let base = CONS[c];
          if (ch[i + 1] === '़') {
            base = NUKTA[c] || base;
            i++;
          }
          out.push(base);
          const n = ch[i + 1];
          if (MATRA[n]) {
            out.push(MATRA[n]);
            i++;
          } else if (n === '्') {
            i++; // virama: no vowel
          } else out.push('~a'); // inherent a, dropped at the end of a word
        } else if (VOWEL[c]) out.push(VOWEL[c]);
        else if (c === 'ं' || c === 'ँ') out.push('n');
        else if (c === 'ः') out.push('h');
        else if (/[A-Za-z]/.test(c)) out.push(c);
      }
      if (out[out.length - 1] === '~a') out.pop();
      return out.join('').replace(/~a/g, 'a');
    })
    .join(' ');
}
