/** CRM funnel stages (online-lead.ru parity). */

export const CRM_STAGES = [
  { id: 'new', label: 'Новые', tone: 'sky' },
  { id: 'contacted', label: 'Связались', tone: 'amber' },
  { id: 'qualified', label: 'Квалификация', tone: 'violet' },
  { id: 'won', label: 'Сделка', tone: 'emerald' },
  { id: 'lost', label: 'Отказ', tone: 'zinc' },
];

export const CRM_STAGE_IDS = CRM_STAGES.map((s) => s.id);

const LEGACY_STAGE = {
  dialog: 'contacted',
  hot: 'qualified',
};

export function normalizeLeadStage(stage) {
  const s = String(stage || 'new');
  if (LEGACY_STAGE[s]) return LEGACY_STAGE[s];
  return CRM_STAGE_IDS.includes(s) ? s : 'new';
}

export function normalizeLead(lead) {
  if (!lead) return lead;
  return {
    ...lead,
    stage: normalizeLeadStage(lead.stage),
  };
}

export function crmStageLabel(stage) {
  return CRM_STAGES.find((s) => s.id === normalizeLeadStage(stage))?.label || stage || '—';
}

/** Assignee list — single user today; extensible for team later. */
export function listCrmAssignees(user) {
  if (!user) return [];
  const name = String(user.name || user.email || 'Я').trim() || 'Я';
  return [{ id: user.id, name }];
}

export function resolveAssigneeName(assigneeUserId, user) {
  if (!assigneeUserId) return '';
  const members = listCrmAssignees(user);
  return members.find((m) => m.id === assigneeUserId)?.name || '';
}
