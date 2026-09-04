import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const byteToChar1251 = new TextDecoder('windows-1251');
const charToByte = new Map();
for (let b = 0; b < 256; b += 1) {
  const ch = byteToChar1251.decode(Uint8Array.of(b));
  if (!charToByte.has(ch)) charToByte.set(ch, b);
}

const CP1252 = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85],
  ['†', 0x86], ['‡', 0x87], ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a],
  ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e], ['‘', 0x91], ['’', 0x92],
  ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97],
  ['˜', 0x98], ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c],
  ['ž', 0x9e], ['Ÿ', 0x9f],
]);

function charToOrigByte(ch) {
  if (CP1252.has(ch)) return CP1252.get(ch);
  if (charToByte.has(ch)) return charToByte.get(ch);
  const cp = ch.codePointAt(0);
  if (cp <= 0xff) return cp;
  return null;
}

function decodeMojibake(s) {
  const bytes = [];
  for (const ch of s) {
    const b = charToOrigByte(ch);
    if (b == null) return null;
    bytes.push(b);
  }
  const out = Buffer.from(bytes).toString('utf8');
  if (out.includes('\uFFFD')) return null;
  if (!/[А-Яа-яЁё]/.test(out)) return null;
  return out;
}

function looksMojibake(s) {
  return /Р[^\x00-\x7F]|вЂ|в‚|В[«»·]|ЃР|ІР|ѕР|ґР|ЅР|µС|±Р|»Р|‚Р/.test(s);
}

function unescape(body, q) {
  return body
    .replace(/\\\\/g, '\0')
    .replace(new RegExp('\\\\' + q, 'g'), q)
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\0/g, '\\');
}

function escape(str, q) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(new RegExp(q, 'g'), '\\' + q);
}

function fixFile(text) {
  let hits = 0;
  const next = text.replace(/(['"])((?:\\.|(?!\1)[^])*?)\1/g, (whole, q, body) => {
    const raw = unescape(body, q);
    if (!looksMojibake(raw)) return whole;
    const decoded = decodeMojibake(raw);
    if (!decoded || decoded === raw) return whole;
    hits += 1;
    return q + escape(decoded, q) + q;
  });
  return { text: next, hits };
}

const sample = readFileSync('server/routes/tg-routes.mjs', 'utf8').match(/error: '([^']*Lite[^']*)'/)[1];
console.log('IN ', sample);
console.log('OUT', decodeMojibake(sample));

let files = 0;
for (const name of readdirSync('server/routes')) {
  if (!name.endsWith('.mjs')) continue;
  const file = join('server/routes', name);
  const src = readFileSync(file, 'utf8');
  if (!looksMojibake(src)) continue;
  const { text, hits } = fixFile(src);
  if (!hits) {
    console.log('no string hits', file);
    continue;
  }
  writeFileSync(file, text, 'utf8');
  files += 1;
  console.log('fixed', file, 'strings', hits);
}
console.log('files', files);
console.log('verify', readFileSync('server/routes/tg-routes.mjs', 'utf8').match(/error: '([^']*Lite[^']*)'/)?.[1]);
