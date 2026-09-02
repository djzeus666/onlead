/** Russian INN checksum (10 or 12 digits). Empty is allowed; all-zero is not. */
export function isValidInn(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d || /^0+$/.test(d)) return false;
  if (d.length === 10) {
    const w = [2, 4, 10, 3, 5, 9, 4, 6, 8];
    const s = w.reduce((a, c, i) => a + c * Number(d[i]), 0) % 11 % 10;
    return s === Number(d[9]);
  }
  if (d.length === 12) {
    const w1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const w2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const n1 = w1.reduce((a, c, i) => a + c * Number(d[i]), 0) % 11 % 10;
    const n2 = w2.reduce((a, c, i) => a + c * Number(d[i]), 0) % 11 % 10;
    return n1 === Number(d[10]) && n2 === Number(d[11]);
  }
  return false;
}

export function inn10FromNine(nine) {
  const d = String(nine || '').replace(/\D/g, '').slice(0, 9).padStart(9, '1');
  const w = [2, 4, 10, 3, 5, 9, 4, 6, 8];
  const s = w.reduce((a, c, i) => a + c * Number(d[i]), 0) % 11 % 10;
  return d + s;
}
