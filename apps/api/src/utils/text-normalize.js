// Normaliza texto para hashing reproducible
export function normalizeText(input) {
  if (!input || typeof input !== 'string') return '';
  // NFKC → unicode canonical, trim y colapso de espacios
  const nfkc = input.normalize('NFKC').trim();
  return nfkc.replace(/\s+/g, ' ');
}
