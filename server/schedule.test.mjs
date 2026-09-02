import test from 'node:test';
import assert from 'node:assert/strict';
import { hourFromLabel, mskParts, postingDue, stepDelayMs, stepDue, storiesDue, withinSendHour } from './schedule.mjs';

/** 07:00 UTC is 10:00 in Moscow. */
const at = (utcHour) => new Date(Date.UTC(2026, 0, 31, utcHour, 0, 0));

test('pause between steps is read from the dropdown', () => {
  assert.equal(stepDelayMs('2 мин'), 120000);
  assert.equal(stepDelayMs('15 мин'), 900000);
  assert.equal(stepDelayMs('1 час'), 3600000);
  assert.equal(stepDelayMs('1 день'), 86400000);
  assert.equal(stepDelayMs(''), 0);
  assert.equal(stepDelayMs('без паузы'), 0);
});

test('a campaign waits out its own pause', () => {
  const now = Date.UTC(2026, 0, 31, 12, 0, 0);
  const minuteAgo = new Date(now - 60000).toISOString();
  assert.equal(stepDue(minuteAgo, '15 мин', now), false);
  assert.equal(stepDue(minuteAgo, '2 мин', now), false);
  assert.equal(stepDue(new Date(now - 200000).toISOString(), '2 мин', now), true);
  assert.equal(stepDue(null, '1 час', now), true);
  assert.equal(stepDue(minuteAgo, '', now), true);
});

test('send hour is read in Moscow time', () => {
  assert.equal(hourFromLabel('09:00'), 9);
  assert.equal(hourFromLabel('18:00'), 18);
  assert.equal(hourFromLabel('Сейчас'), null);
  assert.equal(withinSendHour('10:00', at(7)), true);
  assert.equal(withinSendHour('09:00', at(7)), false);
  assert.equal(withinSendHour('', at(7)), true);
});

test('"Сейчас" posts immediately, timed options wait for their hour', () => {
  assert.equal(postingDue('Сейчас', null, at(7)).due, true);
  assert.equal(postingDue('', null, at(7)).due, true);
  assert.equal(postingDue('Сегодня 18:00', null, at(7)).due, false);
  assert.equal(postingDue('Сегодня 18:00', null, at(15)).due, true);
});

test('"Завтра 10:00" does not fire on the day the campaign started', () => {
  const started = at(7).toISOString();
  assert.equal(postingDue('Завтра 10:00', started, at(9)).due, false);
  const nextDay = new Date(Date.UTC(2026, 1, 1, 8, 0, 0));
  assert.equal(postingDue('Завтра 10:00', started, nextDay).due, true);
});

test('a recurring schedule fires in its window only', () => {
  assert.equal(postingDue('По расписанию', null, at(7)).due, true);
  assert.equal(postingDue('По расписанию', null, at(15)).due, false);
  assert.equal(postingDue('По расписанию', null, at(15)).note, 'ждём 10:00 МСК');
});

test('stories schedule respects daily slot and avoids duplicate same day', () => {
  const now = at(7);
  const { dayKey } = mskParts(now);
  assert.equal(storiesDue('Сейчас', null, now).due, true);
  assert.equal(storiesDue('Каждый день 10:00', null, now).due, true);
  assert.equal(storiesDue('Каждый день 10:00', dayKey, now).due, false);
  assert.equal(storiesDue('Пн/Ср/Пт 19:00', null, at(15)).due, false);
});
