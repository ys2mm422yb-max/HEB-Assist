import { validateAnchoredHebText } from './evidence-pipeline.js';

export const SECTION_KEYS = {
  A: ['a', 'b', 'c', 'd'],
  B: ['a', 'b', 'c', 'd', 'e'],
  C: ['a', 'b', 'c', 'd', 'e'],
};

const VALID_STATUS = new Set(['supported', 'missing', 'context_only', 'ambiguous']);
const MISSING_TEXT_RE = /^Hierzu liegen keine ausreichenden Angaben vor\.?$/i;

export function stripThinkingContent(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>\s*/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
}

function normalizeEvidenceIds(value, validIds, maxEvidence) {
  const source = Array.isArray(value)
    ? value
    : String(value || '').split(/[\s,;]+/);
  const result = [];
  const seen = new Set();
  for (const raw of source) {
    const id = String(raw || '').toUpperCase().trim();
    if (!/^S\d+$/.test(id) || !validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= maxEvidence) break;
  }
  return result;
}

function extractField(block, name) {
  const pattern = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*([^\\n]*)`, 'i');
  return block.match(pattern)?.[1]?.trim() || '';
}

function extractTextField(block) {
  const match = block.match(/(?:^|\n)\s*TEXT\s*:\s*([\s\S]*)$/i);
  if (!match) return '';
  return String(match[1] || '').replace(/\s+/g, ' ').trim();
}

export function parseReasonedSections(text, units, formType, { maxEvidence = 10 } = {}) {
  const cleaned = stripThinkingContent(text);
  const keys = SECTION_KEYS[formType] || SECTION_KEYS.A;
  const validIds = new Set((units || []).map((unit) => unit.id));
  const sections = {};

  for (const key of keys) {
    const tag = key.toUpperCase();
    const blockMatch = cleaned.match(new RegExp(`<SECTION_${tag}>([\\s\\S]*?)<\\/SECTION_${tag}>`, 'i'));
    const block = blockMatch?.[1] || '';
    let status = extractField(block, 'STATUS').toLowerCase();
    const evidence = normalizeEvidenceIds(extractField(block, 'EVIDENCE'), validIds, maxEvidence);
    const body = extractTextField(block);

    if (!VALID_STATUS.has(status)) {
      status = body && !MISSING_TEXT_RE.test(body) ? 'supported' : 'missing';
    }
    if (!evidence.length && status === 'supported' && !MISSING_TEXT_RE.test(body)) {
      status = 'ambiguous';
    }
    if (MISSING_TEXT_RE.test(body)) status = 'missing';

    sections[key] = { status, evidence, text: body };
  }

  return { sections };
}

export function evidenceTextsForSection(parsed, units, key) {
  const byId = new Map((units || []).map((unit) => [unit.id, unit.text]));
  return (parsed?.sections?.[key]?.evidence || []).map((id) => byId.get(id)).filter(Boolean);
}

function evidenceShowsSupport(evidenceTexts) {
  return /\b(benötig\w*|brauch\w*|unterstütz\w*|hilfe\w*|impuls\w*|erinner\w*|aufforder\w*|angebot\w*|begleit\w*|anleit\w*)\b/i
    .test((evidenceTexts || []).join(' '));
}

export function validateReasonedSection(text, evidenceTexts, { maxWords = 100, allowMissing = false } = {}) {
  const candidate = String(text || '').replace(/\s+/g, ' ').trim();
  if (!candidate) return { ok: false, reasons: ['leer'] };

  if (MISSING_TEXT_RE.test(candidate)) {
    return allowMissing
      ? { ok: true, reasons: [] }
      : { ok: false, reasons: ['unbegründet als fehlende Angabe ausgegeben'] };
  }

  const reasons = [];
  if (/\bkeine\s+selbstversorgung\s+ist\s+notwendig\b/i.test(candidate)) {
    reasons.push('bekannte inhaltlich widersprüchliche Negation');
  }
  if (/\bkeine\s+(?:neuen\s+)?(?:maßnahmen|ziele|hilfebedarfsstufen)(?:\s*,|\s+und|\s*$)/i.test(candidate)) {
    reasons.push('metaartige Negativliste');
  }
  if (evidenceShowsSupport(evidenceTexts) && /\bkein(?:e|en|er|es)?\s+(?:hilfebedarf|unterstützungsbedarf|unterstützung|hilfe)\b/i.test(candidate)) {
    reasons.push('belegten Unterstützungsbedarf verneint');
  }
  if (/\b(keine Hilfestellung|Information und Beratung|Erschließung von Hilfen im Umfeld|Individuelle Planung, Beobachtung, Rückmeldung|begleitende, übende Unterstützung|intensives individuelles Angebot)\b/i.test(candidate)) {
    const source = (evidenceTexts || []).join(' ');
    const formal = candidate.match(/\b(keine Hilfestellung|Information und Beratung|Erschließung von Hilfen im Umfeld|Individuelle Planung, Beobachtung, Rückmeldung|begleitende, übende Unterstützung|intensives individuelles Angebot)\b/i)?.[1];
    if (formal && !source.toLowerCase().includes(formal.toLowerCase())) reasons.push('formale Hilfebedarfsstufe nicht belegt');
  }
  if (reasons.length) return { ok: false, reasons };

  return validateAnchoredHebText(candidate, evidenceTexts, { maxWords });
}
