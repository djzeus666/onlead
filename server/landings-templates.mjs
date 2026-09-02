/** PRO landing template ids (mirror js/landings-templates.js tier=pro). */
export const PRO_LANDING_TEMPLATE_IDS = new Set([
  'agency',
  'booking',
  'event',
  'expert',
  'product',
]);

export function isProLandingTemplate(id) {
  return PRO_LANDING_TEMPLATE_IDS.has(String(id || '').trim());
}
