/** AI rewrite for section-based landings. */
import { readAiConfig, generateAiChat } from './ai.mjs';
import { landingContent, mergeGeneratedContent, sectionsToFlat } from './landings-sections.mjs';

function parseAiJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1].trim() : raw;
  try {
    const data = JSON.parse(body);
    if (data?.sections) return data;
    if (data?.content?.sections) return data.content;
    return null;
  } catch {
    return null;
  }
}

export async function generateLandingContent(page, { business, city }, db) {
  const biz = String(business || '').trim();
  if (biz.length < 3) throw new Error('Опишите бизнес — минимум 3 символа');
  const current = landingContent(page);
  const tpl = (page.template || '').trim();
  const systemPrompt = [
    'Ты — редактор посадочных страниц. Тебе дают JSON лендинга и описание бизнеса.',
    'Перепиши ВСЕ текстовые поля под этот бизнес на русском языке.',
    'Строго сохрани структуру JSON: те же секции, в том же порядке, те же ключи и то же количество элементов в массивах.',
    'Не добавляй и не удаляй поля. Не меняй значения поля "type" и не трогай "accent" и "fields".',
    'Пиши конкретно и по делу, без рекламных штампов и слова «уникальный».',
    tpl ? `Шаблон: ${tpl}.` : '',
    'Ответ — только JSON объекта { "accent": "...", "sections": [...] }, без markdown.',
  ].filter(Boolean).join('\n');

  const userMessage = [
    `Бизнес: ${biz}`,
    city?.trim() ? `Город: ${city.trim()}` : '',
    '',
    'JSON лендинга:',
    JSON.stringify(current),
  ].filter(Boolean).join('\n');

  const ai = readAiConfig(db?.settings || {});
  const reply = await generateAiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ], ai, { maxTokens: 3500 });

  const generated = parseAiJson(reply?.text || reply);
  if (!generated?.sections) throw new Error('AI вернул неразборчивый ответ — попробуйте ещё раз');
  const merged = mergeGeneratedContent(current, generated);
  return sectionsToFlat(merged, page);
}
