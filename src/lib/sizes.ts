/** Letter sizes in wearing order; anything else sorts numerically, then alphabetically. */
const LETTER_ORDER = ["XXS", "XS", "S", "S/M", "M", "M/L", "L", "L/XL", "XL", "XXL", "3XL", "4XL"];

const rank = (label: string): [number, number, string] => {
  const s = label.trim().toUpperCase();
  const letter = LETTER_ORDER.indexOf(s);
  if (letter >= 0) return [0, letter, s];
  const n = Number.parseFloat(s);
  if (Number.isFinite(n) && /^\d/.test(s)) return [1, n, s];
  if (s === "ONE SIZE") return [3, 0, s];
  return [2, 0, s];
};

export const compareSizes = (a: string, b: string) => {
  const [ga, na, sa] = rank(a);
  const [gb, nb, sb] = rank(b);
  return ga - gb || na - nb || sa.localeCompare(sb);
};

/** Canonical label as stored: trimmed, letter sizes upper-cased ("m" → "M"), "one size" → "One Size". */
export const normalizeSize = (label: string) => {
  const s = label.trim().replace(/\s+/g, " ");
  if (/^one size$/i.test(s)) return "One Size";
  return /^[a-z/0-9]+$/i.test(s) && /[a-z]/i.test(s) && s.length <= 5 ? s.toUpperCase() : s;
};
