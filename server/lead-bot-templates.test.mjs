import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  botKindLabel,
  buildExecutableScenario,
  buildWidgetSnippet,
  scenarioToFunnelSections,
} from './lead-bot-templates.mjs';
import { submitWidgetLead } from './lead-bots.mjs';

test('lead bot templates build scenario and funnel sections', () => {
  const input = { kind: 'lead', business: 'Studio', city: 'Ekb', goal: 'Заявка', nicheTitle: 'SMM' };
  assert.equal(botKindLabel('widget'), 'Виджет заявок');
  const sc = buildExecutableScenario(input);
  assert.ok(sc.greeting.includes('Studio'));
  assert.ok(sc.steps.length >= 4);
  const sections = scenarioToFunnelSections(sc);
  assert.ok(sections.length >= 2);
  assert.equal(sections[0].title, 'Старт');
});

test('widget snippet contains endpoint', () => {
  const sn = buildWidgetSnippet({ business: 'Test', endpoint: 'https://x/api/public/widget/k/lead' });
  assert.match(sn, /onlead-widget/);
  assert.match(sn, /https:\/\/x\/api\/public\/widget\/k\/lead/);
});

test('submitWidgetLead rejects honeypot', () => {
  const r = submitWidgetLead('missing', { name: 'A', phone: '123', company: 'spam' });
  assert.equal(r.ok, false);
});
