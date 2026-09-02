/** Minimal SMTP client (TLS / STARTTLS + AUTH LOGIN). No npm. */
import net from 'node:net';
import tls from 'node:tls';

function encodeHeader(value) {
  const s = String(value || '');
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
}

function b64(s) {
  return Buffer.from(String(s), 'utf8').toString('base64');
}

function readReply(socket) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.replace(/\r/g, '').split('\n').filter((l) => l.length);
      if (!lines.length) return;
      const last = lines[lines.length - 1];
      if (!/^\d{3} /.test(last)) return;
      socket.off('data', onData);
      socket.off('error', onErr);
      resolve({ code: Number(last.slice(0, 3)), text: buf });
    };
    const onErr = (err) => {
      socket.off('data', onData);
      reject(err);
    };
    socket.on('data', onData);
    socket.once('error', onErr);
  });
}

async function cmd(socket, expect, line) {
  if (line != null) socket.write(line + '\r\n');
  const reply = await readReply(socket);
  const cls = Math.floor(reply.code / 100);
  const ok = Array.isArray(expect) ? expect.includes(reply.code) || expect.includes(cls) : (reply.code === expect || cls === expect);
  if (!ok) throw new Error(`SMTP ${reply.code}: ${String(reply.text).replace(/\s+/g, ' ').slice(0, 180)}`);
  return reply;
}

function connectRaw({ host, port, timeout }) {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host, port }, () => resolve(sock));
    sock.setTimeout(timeout);
    sock.once('error', reject);
    sock.once('timeout', () => reject(new Error('SMTP timeout')));
  });
}

function upgradeTls(socket, host, timeout) {
  return new Promise((resolve, reject) => {
    const tlsSock = tls.connect({ socket, servername: host, timeout }, () => resolve(tlsSock));
    tlsSock.once('error', reject);
  });
}

function connectTls({ host, port, timeout }) {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port, servername: host }, () => resolve(sock));
    sock.setTimeout(timeout);
    sock.once('error', reject);
    sock.once('timeout', () => reject(new Error('SMTP timeout')));
  });
}

function buildMime({ fromName, from, replyTo, to, subject, text, html }) {
  const alt = `alt${Date.now().toString(36)}`;
  const fromLine = `${encodeHeader(fromName || 'OnLead')} <${from}>`;
  const parts = [
    `From: ${fromLine}`,
    `To: ${to}`,
    `Reply-To: ${replyTo || from}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    'Auto-Submitted: auto-generated',
    `List-Unsubscribe: <mailto:${replyTo || from}?subject=unsubscribe>`,
    '',
    `--${alt}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(text || ''),
  ];
  if (html) {
    parts.push(
      `--${alt}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64(html),
    );
  }
  parts.push(`--${alt}--`, '');
  return parts.join('\r\n');
}

export async function sendSmtp(opts) {
  const timeout = Number(opts.timeout || 30000);
  const host = opts.host;
  const primaryPort = Number(opts.port || 465);
  try {
    await sendSmtpOnce({ ...opts, host, port: primaryPort, timeout, secure: opts.secure !== false && primaryPort !== 587 });
  } catch (err) {
    if (primaryPort === 587) throw err;
    await sendSmtpOnce({ ...opts, host, port: 587, timeout, secure: false });
  }
}

async function sendSmtpOnce(opts) {
  const host = opts.host;
  const port = Number(opts.port || 465);
  const secure = opts.secure !== false && port === 465;
  const timeout = Number(opts.timeout || 30000);
  let socket = secure
    ? await connectTls({ host, port, timeout })
    : await connectRaw({ host, port, timeout });

  await cmd(socket, 2, null);
  await cmd(socket, 2, `EHLO onlead.m360-ural.online`);
  if (!secure) {
    await cmd(socket, 2, 'STARTTLS');
    socket.removeAllListeners('timeout');
    socket = await upgradeTls(socket, host, timeout);
    socket.setTimeout(timeout);
    socket.once('timeout', () => socket.destroy(new Error('SMTP timeout')));
    await cmd(socket, 2, `EHLO onlead.m360-ural.online`);
  }
  await cmd(socket, 3, 'AUTH LOGIN');
  await cmd(socket, 3, b64(opts.user));
  await cmd(socket, 2, b64(opts.pass));
  await cmd(socket, 2, `MAIL FROM:<${opts.from}>`);
  await cmd(socket, 2, `RCPT TO:<${opts.to}>`);
  await cmd(socket, 3, 'DATA');
  const mime = buildMime(opts);
  socket.write(mime.replace(/^\./gm, '..') + '\r\n.\r\n');
  await cmd(socket, 2, null);
  try { await cmd(socket, 2, 'QUIT'); } catch { /* ignore */ }
  socket.end();
}
