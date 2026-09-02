import { load, mutate } from './db.mjs';
import { readAiConfig, generateAiChat } from './ai.mjs';
import {
  buildLeadgenMatchScorePrompt,
  parseLeadgenMatchScore,
  buildLeadgenDraftReplyPrompt,
} from './ai-prompts.mjs';

function findMatch(userId, matchId) {
  return (load().leadgenMatches || []).find((m) => m.id === matchId && m.userId === userId) || null;
}

export async function scoreLeadgenMatch(userId, matchId) {
  const m0 = findMatch(userId, matchId);
  if (!m0) throw new Error('Нет совпадения');
  const settings = load().settings;
  const ai = readAiConfig(settings);
  if (!ai.configured) throw new Error('AI не настроен в админке');
  const { system, user } = buildLeadgenMatchScorePrompt({
    text: m0.text,
    matchedPhrase: m0.matchedPhrase,
    kind: m0.kind,
    platform: 'vk',
    authorName: m0.authorName,
  });
  const { text } = await generateAiChat(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    ai,
    { maxTokens: 200, temperature: 0.3 },
  );
  const parsed = parseLeadgenMatchScore(text);
  if (!parsed) throw new Error('AI вернул неразборный ответ');
  return mutate((d) => {
    const m = (d.leadgenMatches || []).find((x) => x.id === matchId && x.userId === userId);
    if (!m) return null;
    m.aiScore = parsed.score;
    m.aiScoreReason = parsed.reason;
    m.score = Math.max(m.score || 0, parsed.score);
    m.aiScoredAt = Date.now();
    return m;
  });
}

export async function draftLeadgenMatchReply(userId, matchId) {
  const m0 = findMatch(userId, matchId);
  if (!m0) throw new Error('Нет совпадения');
  const settings = load().settings;
  const ai = readAiConfig(settings);
  if (!ai.configured) throw new Error('AI не настроен в админке');
  const { system, user } = buildLeadgenDraftReplyPrompt({
    text: m0.text,
    matchedPhrase: m0.matchedPhrase,
    kind: m0.kind,
    platform: 'vk',
    authorName: m0.authorName,
    note: m0.note,
  });
  const { text } = await generateAiChat(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    ai,
    { maxTokens: 400, temperature: 0.7 },
  );
  const draft = String(text || '').trim().replace(/^["«]|["»]$/g, '').slice(0, 4000);
  if (!draft) throw new Error('AI не сгенерировал текст');
  return mutate((d) => {
    const m = (d.leadgenMatches || []).find((x) => x.id === matchId && x.userId === userId);
    if (!m) return null;
    m.aiDraftReply = draft;
    return m;
  });
}
