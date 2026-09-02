/** Pure funnel stepper — used by webhook worker and tests. */

export function parseButtons(raw) {
  return String(raw || '')
    .split(/[,，;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function isPaymentButton(text) {
  return /^я\s+оплатил/i.test(String(text || '').trim());
}

export function isPaymentSection(section) {
  const blob = `${section?.title || ''} ${section?.text || ''} ${section?.buttons || ''}`.toLowerCase();
  if (/оплат|чек|скрин|перевод|реквизит/.test(blob)) return true;
  return parseButtons(section?.buttons).some((b) => isPaymentButton(b));
}

export function advanceFunnel(funnel, stepIndex, input) {
  const sections = Array.isArray(funnel?.sections) ? funnel.sections : [];
  const text = String(input || '').trim();
  if (!sections.length) return { step: 0, section: null, done: true, started: false };
  if (!text || /^\/start\b/i.test(text) || /^в начало$/i.test(text)) {
    return { step: 0, section: sections[0], done: false, started: true };
  }
  const idx = Math.max(0, Math.min(Number(stepIndex) || 0, sections.length - 1));
  if (/^назад$/i.test(text)) {
    const step = Math.max(0, idx - 1);
    return { step, section: sections[step], done: false, started: false };
  }
  const byTitle = sections.findIndex((s) => String(s.title || '').trim().toLowerCase() === text.toLowerCase());
  if (byTitle >= 0) {
    return { step: byTitle, section: sections[byTitle], done: false, started: false };
  }
  const currentButtons = parseButtons(sections[idx]?.buttons);
  const hitBtn = currentButtons.some((b) => b.toLowerCase() === text.toLowerCase());
  if (hitBtn || text) {
    if (hitBtn && (isPaymentButton(text) || isPaymentSection(sections[idx]))) {
      return {
        step: idx,
        section: sections[idx],
        done: false,
        started: false,
        awaitingReceipt: true,
      };
    }
    const next = idx + 1;
    if (next >= sections.length) {
      return { step: idx, section: sections[idx], done: true, started: false };
    }
    return { step: next, section: sections[next], done: false, started: false };
  }
  return { step: idx, section: sections[idx], done: false, started: false };
}

export function sectionMessage(section, funnel) {
  const title = String(section?.title || '').trim();
  const body = String(section?.text || '').trim();
  const bits = [];
  if (title) bits.push(title);
  if (body) bits.push(body);
  if (funnel?.product || funnel?.price) {
    const offer = [funnel.product, funnel.price].filter(Boolean).join(' · ');
    if (offer && /оплат|купить|тариф/i.test(`${title} ${body}`)) bits.push(offer);
  }
  return bits.join('\n\n').slice(0, 3500) || 'Продолжим.';
}
