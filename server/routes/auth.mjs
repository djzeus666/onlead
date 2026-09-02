import { hashPassword, verifyPassword, randomToken } from '../crypto.mjs';
import { load, mutate, publicUser } from '../db.mjs';
import { isProd } from '../hardening.mjs';
import {
  send, sendFail, readBody, enforceRate,
} from '../http-api.mjs';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  consumeVerifyCode,
  consumeResetCode,
  skipEmailGate,
  userVerified,
} from '../notify.mjs';
import { acceptTeamInvite, findPendingTeamInvite } from '../cabinet.mjs';

export async function handle(ctx) {
  const { req, res, method, path } = ctx;

  if (method === 'POST' && path === '/api/auth/register') {
    if (!enforceRate(req, res, 'register')) return true;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || email.split('@')[0]);
    const refCode = String(body.ref || body.referralCode || '').trim().toUpperCase();
    const teamInvite = String(body.teamInvite || '').trim();
    if (!email || !email.includes('@')) { send(res, 400, { error: 'Укажите email' }); return true; }
    if (password.length < 8) { send(res, 400, { error: 'Пароль должен быть не короче 8 символов' }); return true; }
    if (body.consent !== true && body.consent !== '1' && body.consent !== 'on') {
      send(res, 400, { error: 'Нужно согласие с офертой и политикой конфиденциальности' });
      return true;
    }
    const exists = load().users.find((u) => u.email === email);
    if (exists) { send(res, 409, { error: 'Такой email уже есть' }); return true; }
    if (teamInvite) {
      const inviteCheck = findPendingTeamInvite(load(), teamInvite, email);
      if (!inviteCheck.ok) { send(res, 400, { error: inviteCheck.error }); return true; }
    }
    const user = mutate((db) => {
      const referrer = refCode
        ? db.users.find((x) => String(x.referral?.code || '').toUpperCase() === refCode)
        : null;
      const skip = skipEmailGate(email);
      const u = {
        id: 'u' + Date.now(), name, email, passwordHash: hashPassword(password), role: 'user',
        balance: 0, refBalance: 0, trialUntil: Date.now() + db.settings.trialHours * 3600 * 1000,
        packageId: null, enabledTools: {}, accountSlots: 3,
        referral: { invited: 0, paying: 0, earned: 0, code: randomToken(4).slice(0, 8).toUpperCase() },
        referredBy: referrer && referrer.email !== email ? referrer.id : null,
        banned: false, emailVerified: skip, createdAt: Date.now(),
      };
      db.users.push(u);
      if (u.referredBy) {
        const owner = db.users.find((x) => x.id === u.referredBy);
        if (owner?.referral) owner.referral.invited = (owner.referral.invited || 0) + 1;
      }
      db.ops.push({ id: 'o' + Date.now(), userId: u.id, at: new Date().toISOString(), title: 'Триал 72 часа', amount: 0 });
      if (teamInvite) acceptTeamInvite(db, teamInvite, u);
      return u;
    });
    if (user.emailVerified) {
      const token = mutate((db) => {
        const t = randomToken();
        db.sessions.push({ token: t, userId: user.id, exp: Date.now() + 14 * 86400000 });
        return t;
      });
      send(res, 200, { token, user: publicUser(user) });
      return true;
    }
    try {
      await sendVerificationEmail(user);
    } catch (err) {
      sendFail(res, err);
      return true;
    }
    send(res, 200, {
      needsEmailVerification: true,
      email: user.email,
      message: 'Мы отправили код подтверждения на ваш email',
    });
    return true;
  }

  if (method === 'POST' && path === '/api/auth/verify-email') {
    if (!enforceRate(req, res, 'verify')) return true;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || body.token || '');
    const user = load().users.find((u) => u.email === email);
    if (!user) { send(res, 400, { error: 'Неверный код или email' }); return true; }
    if (user.emailVerified) {
      const token = mutate((db) => {
        const t = randomToken();
        db.sessions.push({ token: t, userId: user.id, exp: Date.now() + 14 * 86400000 });
        return t;
      });
      send(res, 200, { token, user: publicUser(user) });
      return true;
    }
    if (!consumeVerifyCode(user, code)) { send(res, 400, { error: 'Код недействителен или устарел' }); return true; }
    const fresh = load().users.find((u) => u.id === user.id);
    sendWelcomeEmail(fresh).catch(() => {});
    const token = mutate((db) => {
      const t = randomToken();
      db.sessions.push({ token: t, userId: user.id, exp: Date.now() + 14 * 86400000 });
      return t;
    });
    send(res, 200, { token, user: publicUser(fresh) });
    return true;
  }

  if (method === 'POST' && path === '/api/auth/resend-verification') {
    if (!enforceRate(req, res, 'resend')) return true;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const user = load().users.find((u) => u.email === email);
    if (!user) { send(res, 200, { ok: true, message: 'Если email зарегистрирован, письмо отправлено' }); return true; }
    if (user.emailVerified) { send(res, 200, { ok: true, message: 'Email уже подтверждён' }); return true; }
    try {
      await sendVerificationEmail(user);
    } catch (err) {
      sendFail(res, err);
      return true;
    }
    send(res, 200, { ok: true, message: 'Новый код отправлен на почту' });
    return true;
  }

  if (method === 'POST' && path === '/api/auth/forgot-password') {
    if (!enforceRate(req, res, 'forgot')) return true;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const user = load().users.find((u) => u.email === email);
    if (user?.passwordHash) {
      await sendPasswordResetEmail(user);
    }
    send(res, 200, { ok: true, message: 'Если email зарегистрирован, код отправлен' });
    return true;
  }

  if (method === 'POST' && path === '/api/auth/reset-password') {
    if (!enforceRate(req, res, 'reset')) return true;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '');
    const password = String(body.password || '');
    if (password.length < 8) { send(res, 400, { error: 'Пароль должен быть не короче 8 символов' }); return true; }
    const user = load().users.find((u) => u.email === email);
    if (!user || !consumeResetCode(user, code)) { send(res, 400, { error: 'Код недействителен или устарел' }); return true; }
    mutate((d) => {
      const x = d.users.find((u) => u.id === user.id);
      if (x) x.passwordHash = hashPassword(password);
    });
    const token = mutate((db) => {
      const t = randomToken();
      db.sessions.push({ token: t, userId: user.id, exp: Date.now() + 14 * 86400000 });
      return t;
    });
    send(res, 200, { token, user: publicUser(load().users.find((u) => u.id === user.id)) });
    return true;
  }

  if (method === 'POST' && path === '/api/auth/login') {
    if (!enforceRate(req, res, 'login')) return true;
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (isProd() && (password === 'admin1234' || password === 'demo1234')) {
      send(res, 401, { error: 'Неверный email или пароль' });
      return true;
    }
    const user = load().users.find((u) => u.email === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      send(res, 401, { error: 'Неверный email или пароль' });
      return true;
    }
    if (user.banned) { send(res, 403, { error: 'Аккаунт заблокирован' }); return true; }
    if (!userVerified(user)) {
      send(res, 403, {
        error: 'Подтвердите email: введите код из письма или запросите новый на странице подтверждения.',
        needsEmailVerification: true,
        email: user.email,
      });
      return true;
    }
    const token = mutate((db) => {
      const t = randomToken();
      db.sessions.push({ token: t, userId: user.id, exp: Date.now() + 14 * 86400000 });
      return t;
    });
    send(res, 200, { token, user: publicUser(user) });
    return true;
  }

  return false;
}
