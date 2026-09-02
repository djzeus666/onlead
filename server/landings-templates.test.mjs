import test from 'node:test';
import assert from 'node:assert/strict';
import { isProLandingTemplate, PRO_LANDING_TEMPLATE_IDS } from './landings-templates.mjs';

test('pro templates are gated server-side', () => {
  assert.equal(isProLandingTemplate('agency'), true);
  assert.equal(isProLandingTemplate('consult'), false);
  assert.ok(PRO_LANDING_TEMPLATE_IDS.has('product'));
});
