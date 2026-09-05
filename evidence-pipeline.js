// Pure local helpers for the evidence-gated HEB pipeline.
// This module never sends data anywhere and never creates fallback HEB text.

const STOP_WORDS = new Set([
  'aber','alle','allem','allen','aller','alles','als','also','am','an','auch','auf','aus','bei','beim','bis','da','das','dass','dem','den','der','des','die','dies','diese','diesem','diesen','dieser','dieses','durch','ein','eine','einem','einen','einer','eines','er','es','für','hat','haben','im','in','ist','ja','mit','nach','nicht','noch','nur','oder','ohne','sie','sich','so','um','und','vom','von','vor','was','wenn','werden','wird','zu','zum','zur','ihre','ihr','ihren','ihrem','ihres','ihnen','ihm','kann','können','soll','sollen','muss','müssen','wurde','wurden','dabei','dann','derzeit','aktuell'
]);

// Nur neutrale HEB-Wörter, die keine neue Tatsache erzeugen. Die Liste dient
// nicht als Wahrheitsprüfung; die semantische Quellenprüfung erfolgt zusätzlich
// mit dem lokalen Sprachmodell.
const GENERIC_HEB_ROOTS = new Set([
  'person','leistungsberechtigt','unterstütz','unterstützungsbedarf','hilfebedarf','bedarf',
  'ressourc','erforderlich','konkret','aktuell','bereich','angab','beleg','besteh','besteht',
  'hinsichtlich','bezüglich','insbesondere','weiterhin','initiier','initiation','aufnahm',
  'beginn','organisation','organisier','durchführ','planung','plan','überblick','übersicht'
]);

const EVALUATIVE_PATTERNS = [
  /\bgute\s+idee\b/i,
  /\bsinnvoll(?:e|er|es|en)?\b/i,
  /\bpositiv(?:e|er|es|en)?\b/i,
  /\bnegativ(?:e|er|es|en)?\b/i,
  /\bangemessen(?:e|er|es|en)?\b/i,
  /\bunangemessen(?:e|er|es|en)?\b/i,
  /\bproblematisch(?:e|er|es|en)?\b/i,
];

const CONCEPT_PATTERNS = {
  bodyCare: /\b(körperpflege|körperhygiene|pflegeprodukt\w*|hygiene)\b/i,
  shopping: /\b(einkauf\w*|einkäufe|geschäft|einkaufsplanung)\b/i,
  finances: /\b(geld|finanz\w*|budget|geldmittel|finanzielle[nrsm]*\s+mittel)\b/i,
  housing: /\b(wohnung|wohnen|wohnraum|haushalt)\b/i,
  work: /\b(arbeit|arbeitsplatz|ausbildung|beschäftigung)\b/i,
  leisure: /\b(freizeit|tagesgestaltung|gesellschaftlichen\s+leben|teilnahme)\b/i,
  relationships: /\b(beziehung\w*|kontakt\w*|soziale[nrsm]*\s+kontakt)\b/i,
};

function cleanUnit(text) {
  return String(text || '')
    .replace(/^\s*(?:[-*•▪●]+|\d+[.)])\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitEvidenceUnits(notes) {
  const normalized = String(notes || '')
    .replace(/\r/g, '\n')
    .replace(/[•▪●]+/g, '\n')
    .replace(/([.!?])\s+/g, '$1\n')
    .replace(/;\s+/g, ';\n');

  const raw = normalized
    .split(/\n+/)
    .map(cleanUnit)
    .filter((unit) => unit.length >= 3);

  const units = [];
  for (const item of raw) {
    if (units.length >= 28) break;
    if (item.length <= 360) {
      units.push(item);
      continue;
    }

    const parts = item.split(/,\s+/).map(cleanUnit).filter((part) => part.length >= 18);
    if (parts.length >= 2) {
      for (const part of parts) {
        if (units.length >= 28) break;
        units.push(part);
      }
    } else {
      units.push(item.slice(0, 360).trim());
    }
  }

  return units.map((text, index) => ({ id: `S${index + 1}`, text }));
}

export function evidenceCatalog(units) {
  return units.map((unit) => `[${unit.id}] ${unit.text}`).join('\n');
}

export function parseEvidenceClassification(text, modes, units, limits = {}) {
  const source = String(text || '').replace(/```[a-z]*\s*/gi, '').replace(/```/g, '');
  const validIds = new Set(units.map((unit) => unit.id));
  const result = {};

  for (const mode of modes) {
    const escaped = mode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Nur horizontale Leerzeichen zulassen. `\s*` würde bei einer leeren Zeile
    // in den nächsten HEB-Unterpunkt springen und dessen IDs fälschlich übernehmen.
    const match = source.match(new RegExp(`(?:^|\\n)[ \\t]*${escaped}[ \\t]*[:=][ \\t]*([^\\n]*)`, 'i'));
    const ids = [];
    const seen = new Set();
    const max = Math.max(0, Number(limits[mode] || 6));

    if (match) {
      for (const rawId of match[1].match(/S\d+/gi) || []) {
        const id = rawId.toUpperCase();
        if (!validIds.has(id) || seen.has(id) || ids.length >= max) continue;
        seen.add(id);
        ids.push(id);
      }
    }
    result[mode] = ids;
  }

  return result;
}

export function getEvidenceTexts(units, ids) {
  const byId = new Map(units.map((unit) => [unit.id, unit.text]));
  return (ids || []).map((id) => byId.get(id)).filter(Boolean);
}

function normalizeWord(word) {
  return String(word || '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-zäöü0-9-]/g, '')
    .trim();
}

function rootWord(word) {
  let value = normalizeWord(word);
  if (value.length <= 4) return value;
  for (const suffix of ['ungen','ung','heiten','heit','keiten','keit','chen','ern','em','en','er','es','e','n','s']) {
    if (value.length - suffix.length >= 4 && value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length);
      break;
    }
  }
  return value;
}

function contentRoots(text, { includeGeneric = true } = {}) {
  const words = String(text || '').match(/[A-Za-zÄÖÜäöüß0-9-]+/g) || [];
  const roots = [];
  for (const raw of words) {
    const word = normalizeWord(raw);
    if (!word || word.length <= 3 || STOP_WORDS.has(word)) continue;
    const root = rootWord(word);
    if (!root) continue;
    if (!includeGeneric && GENERIC_HEB_ROOTS.has(root)) continue;
    roots.push(root);
  }
  return roots;
}

function sourceContainsCausalMarker(text) {
  return /\b(weil|da|aufgrund|bedingt|infolge|wegen)\b/i.test(text);
}

function numbersIn(text) {
  return new Set((String(text || '').match(/\b\d+(?:[.,]\d+)?\b/g) || []));
}

function conceptSet(text) {
  const found = new Set();
  for (const [key, pattern] of Object.entries(CONCEPT_PATTERNS)) {
    if (pattern.test(String(text || ''))) found.add(key);
  }
  return found;
}

function introducesForeignConcept(output, evidence) {
  const sourceConcepts = conceptSet(evidence);
  const outputConcepts = conceptSet(output);
  if (!sourceConcepts.size || !outputConcepts.size) return false;
  for (const concept of outputConcepts) {
    if (!sourceConcepts.has(concept)) return true;
  }
  return false;
}

function hasScopeMismatch(output, evidence) {
  const activityVerb = '(?:durchführ\\w*|durchzuführ\\w*|erledig\\w*|bewältig\\w*)';
  const sourceInitiationOnly = /\b(impuls\w*|erinner\w*|aufforder\w*|angebot\w*)\b.{0,90}\b(beginnen|beginn\w*|starten|aufnahme)\b/i.test(evidence);
  const sourceSelfExecution = new RegExp(`\\b(selbstständig|eigenständig|überwiegend\\s+selbstständig)\\b.{0,80}\\b${activityVerb}\\b|\\b${activityVerb}\\b.{0,80}\\b(selbstständig|eigenständig)\\b`, 'i').test(evidence);
  const outputNeedsExecutionHelp = new RegExp(`\\b(unterstütz\\w*|hilfe\\w*|hilfebedarf|bedarf)\\b.{0,90}\\b${activityVerb}\\b`, 'i').test(output);
  return outputNeedsExecutionHelp && (sourceInitiationOnly || sourceSelfExecution);
}

export function validateAnchoredHebText(text, evidenceTexts, { maxWords = 50 } = {}) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  const evidence = (evidenceTexts || []).join(' ').trim();
  const reasons = [];

  if (!cleaned) reasons.push('leer');
  if (/!{1,}|\?{2,}|\.{4,}/.test(cleaned)) reasons.push('auffällige Zeichensetzung');
  if (/\*\*|^\s*(?:\d+[.)]|[-*•])\s+/m.test(cleaned)) reasons.push('Listen/Markdown');
  if (/\bHEBI?[-:]|HEB-(?:Bereich|Reise|Bereit|Beispiel)|Abstand\s*100\s*%/i.test(cleaned)) reasons.push('degenerierte HEB-Tokens');
  if (/\b(?:[A-Za-zÄÖÜäöüß]+-){3,}[A-Za-zÄÖÜäöüß]+\b/.test(cleaned)) reasons.push('kaputte Bindestrichkette');
  if (/\bVerbraucher(?:einrichtung|einsprung)\b/i.test(cleaned)) reasons.push('bekanntes Fantasiewort');
  if (/\bmuss\s+(?:konkreten?|konkreter?)?\s*hilfe\s+leisten\b/i.test(cleaned)) reasons.push('ungrammatische Hilfebedarfsformulierung');
  if (EVALUATIVE_PATTERNS.some((pattern) => pattern.test(cleaned))) reasons.push('unzulässige Bewertung');

  if (/\b(weil|da|aufgrund|bedingt durch|infolge|wegen)\b/i.test(cleaned) && !sourceContainsCausalMarker(evidence)) {
    reasons.push('nicht belegte Ursache');
  }

  if (introducesForeignConcept(cleaned, evidence)) reasons.push('fremder Themeninhalt');
  if (hasScopeMismatch(cleaned, evidence)) reasons.push('Unterstützungsumfang verändert');

  const outputNumbers = numbersIn(cleaned);
  const evidenceNumbers = numbersIn(evidence);
  for (const number of outputNumbers) {
    if (!evidenceNumbers.has(number)) {
      reasons.push('nicht belegte Zahl');
      break;
    }
  }

  const wordCount = (cleaned.match(/\S+/g) || []).length;
  if (wordCount > maxWords + 6) reasons.push('zu lang');
  if (cleaned && !/[.!?…][”"']?$/.test(cleaned)) reasons.push('unvollständiger Satz');

  // Lexikalische Abweichungen sind nur noch Diagnosehinweise. Eine rein
  // wortbasierte Sperre hat fachlich korrekte Paraphrasen wie „Initiierung“
  // oder „Überblick“ zu oft verworfen. Die semantische Faktentreue wird im
  // nächsten Schritt zusätzlich vom lokalen Modell gegen genau einen Beleg geprüft.
  const evidenceRoots = new Set(contentRoots(evidence));
  const outputRoots = contentRoots(cleaned, { includeGeneric: false });
  const unsupported = [...new Set(outputRoots.filter((root) => !evidenceRoots.has(root)))];

  return {
    ok: reasons.length === 0,
    reasons,
    unsupported,
    wordCount,
  };
}
