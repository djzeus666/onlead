/** Parse and rotate lead-vk message templates (one per line). */

export function parseLeadTemplates(payload = {}) {
  const chunks = ['templates', 'offer', 'text']
    .map((k) => payload[k])
    .filter(Boolean)
    .join('\n');
  return String(chunks)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function applyLeadTemplate(template, person = {}) {
  const name = String(person.firstName || person.first_name || 'друг').trim() || 'друг';
  return String(template || '')
    .replace(/\{name\}/gi, name)
    .replace(/\{firstName\}/gi, name)
    .replace(/\{first_name\}/gi, name);
}

export function pickLeadTemplate(payload, person, index = 0) {
  const templates = parseLeadTemplates(payload);
  const first = String(person?.firstName || person?.first_name || 'друг').trim() || 'друг';
  if (!templates.length) return `Привет, ${first}!`;
  const tpl = templates[Math.abs(Number(index) || 0) % templates.length];
  return applyLeadTemplate(tpl, person);
}
