import test from 'node:test';
import assert from 'node:assert/strict';
import { flatToSections, sectionsToFlat, normalizeSlug } from './landings-sections.mjs';
import { isPaymentButton } from './tg-funnel.mjs';

test('normalizeSlug strips unsafe chars', () => {
  assert.equal(normalizeSlug('Promo Page!'), 'promo-page');
  assert.equal(normalizeSlug(' promo-page '), 'promo-page');
});

test('flatToSections builds hero and form', () => {
  const content = flatToSections({
    name: 'Test',
    headline: 'Заголовок',
    sub: 'Подзаг',
    cta: 'Записаться',
    fields: ['name', 'phone'],
  });
  assert.equal(content.sections[0].type, 'hero');
  assert.equal(content.sections[0].title, 'Заголовок');
  const form = content.sections.find((s) => s.type === 'form');
  assert.ok(form);
  assert.deepEqual(form.fields, ['name', 'phone']);
});

test('sectionsToFlat roundtrip keeps headline', () => {
  const page = { name: 'Страница', tone: 'teal' };
  const content = flatToSections(page);
  content.sections[0].title = 'Новый заголовок';
  const flat = sectionsToFlat(content, page);
  assert.equal(flat.headline, 'Новый заголовок');
  assert.ok(flat.content?.sections?.length);
});

test('payment button detection', () => {
  assert.equal(isPaymentButton('Я оплатил'), true);
  assert.equal(isPaymentButton('купить'), false);
});
