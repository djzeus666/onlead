import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyLeadTemplate, parseLeadTemplates, pickLeadTemplate } from './lead-templates.mjs';

test('parseLeadTemplates merges templates and offer lines', () => {
  const rows = parseLeadTemplates({
    templates: 'Hi {name}\nSecond line',
    offer: 'Offer line',
  });
  assert.equal(rows.length, 3);
  assert.equal(rows[0], 'Hi {name}');
});

test('pickLeadTemplate rotates by index', () => {
  const payload = { templates: 'A {name}\nB {name}\nC {name}' };
  assert.match(pickLeadTemplate(payload, { firstName: 'Ann' }, 0), /^A Ann/);
  assert.match(pickLeadTemplate(payload, { firstName: 'Ann' }, 1), /^B Ann/);
  assert.match(pickLeadTemplate(payload, { firstName: 'Ann' }, 4), /^B Ann/);
});

test('applyLeadTemplate substitutes name tokens', () => {
  assert.equal(
    applyLeadTemplate('Здравствуй, {name}!', { firstName: 'Иван' }),
    'Здравствуй, Иван!',
  );
});
