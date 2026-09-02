import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRM_STAGE_IDS,
  normalizeLeadStage,
  crmStageLabel,
  listCrmAssignees,
} from './crm.mjs';

test('CRM has five stages including lost', () => {
  assert.deepEqual(CRM_STAGE_IDS, ['new', 'contacted', 'qualified', 'won', 'lost']);
  assert.equal(crmStageLabel('lost'), 'Отказ');
});

test('legacy stages map to OL names', () => {
  assert.equal(normalizeLeadStage('dialog'), 'contacted');
  assert.equal(normalizeLeadStage('hot'), 'qualified');
  assert.equal(normalizeLeadStage('won'), 'won');
});

test('assignee list returns current user', () => {
  const rows = listCrmAssignees({ id: 'u1', name: 'Артём', email: 'a@test.ru' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'u1');
  assert.equal(rows[0].name, 'Артём');
});
