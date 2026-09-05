const SUPPORT_PATTERNS = [
  { re: /erinner|impuls/i, text: 'verbale Erinnerungs- bzw. Aktivierungsimpulse' },
  { re: /gemeinsam|planung|planen|struktur/i, text: 'gemeinsame bzw. strukturierende Planung' },
  { re: /anleit|schrittweise/i, text: 'anleitende Unterstützung' },
  { re: /begleit/i, text: 'begleitende Unterstützung' },
  { re: /motiv/i, text: 'motivierende Unterstützung' },
  { re: /beratung|information/i, text: 'Information und Beratung' },
];

const DEVELOPMENT_RE = /inzwischen|mittlerweile|seitdem|häufiger|seltener|mehr|weniger|verbesser|verschlechter|stabil|weiterhin|im verlauf|gegenüber|fortschritt|rückgang/i;
const MEASURE_RE = /wurde|wurden|erhielt|erfolgt|begleitet|unterstützt|erinnert|angeleitet|angeboten|gemeinsam|trainiert|geübt|besprochen/i;
const FUTURE_RE = /soll|sollen|zukünftig|künftig|weitergeführt|fortgeführt|geplant|weiterhin vorgesehen|weiter erfolgen/i;
const RESOURCE_RE = /selbstständig|eigenständig|selbst aus|gelingt|kann |können |schafft|übernimmt|führt .* selbst/i;
const SUPPORT_RE = /benötigt|braucht|bedarf|erinner|impuls|unterstütz|begleit|gemeinsam|anleit|hilfe|struktur|motiv/i;

function clean(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

function sentences(text) {
  const value = clean(text);
  if (!value) return [];
  return value
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function ensurePeriod(text) {
  const value = clean(text);
  if (!value) return '';
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function professionalize(sentence) {
  let value = clean(sentence);
  value = value
    .replace(/\böfters\b/gi, 'häufiger')
    .replace(/\boft\b/gi, 'häufig')
    .replace(/\bbraucht\b/gi, 'benötigt')
    .replace(/\bvon selbst\b/gi, 'eigeninitiativ')
    .replace(/\bSachen\b/gi, 'benötigten Dinge');

  if (/^die person\b/i.test(value)) {
    value = value.replace(/^die person\b/i, 'Die leistungsberechtigte Person');
  } else if (/^person\b/i.test(value)) {
    value = value.replace(/^person\b/i, 'Die leistungsberechtigte Person');
  }

  return ensurePeriod(value);
}

function joinSentences(items) {
  return items.map(professionalize).join(' ');
}

function supportSummary(allSentences) {
  const source = allSentences.join(' ');
  const types = SUPPORT_PATTERNS.filter((item) => item.re.test(source)).map((item) => item.text);
  const unique = [...new Set(types)];
  const hasSupport = SUPPORT_RE.test(source);
  const hasResources = RESOURCE_RE.test(source);

  if (!hasSupport) {
    return 'Aus der Eingabe lässt sich kein konkreter Unterstützungsbedarf eindeutig ableiten.';
  }

  let text = unique.length
    ? `Der beschriebene Unterstützungsbedarf umfasst ${unique.join(', ')}.`
    : 'Es besteht ein konkreter, in der Eingabe beschriebener Unterstützungsbedarf.';

  if (hasResources) {
    text += ' Vorhandene selbstständige Anteile sollen dabei erhalten und genutzt werden; eine weitergehende Übernahme ist nur dort abzuleiten, wo sie ausdrücklich beschrieben wurde.';
  }
  return text;
}

function goalSummary(allSentences) {
  const source = allSentences.join(' ');
  const hasReminder = /erinner|impuls/i.test(source);
  const hasPlanning = /gemeinsam|planung|planen|struktur/i.test(source);
  const hasResources = RESOURCE_RE.test(source);

  if (hasReminder && hasResources) {
    return 'Die vorhandene Selbstständigkeit in der Durchführung soll erhalten werden. Die eigenständigere Initiierung der beschriebenen Handlung soll im Rahmen der individuellen Möglichkeiten gefördert werden.';
  }
  if (hasPlanning && hasResources) {
    return 'Die vorhandenen selbstständigen Fähigkeiten sollen erhalten und die eigenständigere Beteiligung an Planung und Durchführung weiter gefördert werden.';
  }
  if (hasResources) {
    return 'Die beschriebenen selbstständigen Fähigkeiten sollen erhalten und im Rahmen der individuellen Möglichkeiten weiter stabilisiert werden.';
  }
  if (SUPPORT_RE.test(source)) {
    return 'Die Selbstständigkeit und Teilhabe im beschriebenen Bereich sollen durch bedarfsgerechte Unterstützung erhalten und, soweit möglich, weiterentwickelt werden.';
  }
  return 'Aus der Eingabe lässt sich noch kein ausreichend konkretes Rahmenziel ableiten.';
}

function measuresSummary(allSentences) {
  const source = allSentences.join(' ');
  const measures = [];
  if (/erinner|impuls/i.test(source)) measures.push('bei Bedarf verbale Erinnerungs- bzw. Aktivierungsimpulse geben');
  if (/gemeinsam|planung|planen|struktur/i.test(source)) measures.push('anstehende Schritte gemeinsam und übersichtlich planen');
  if (/anleit|schrittweise/i.test(source)) measures.push('bei Bedarf schrittweise Anleitung anbieten');
  if (/begleit/i.test(source)) measures.push('bedarfsorientiert begleitende Unterstützung anbieten');
  if (/motiv/i.test(source)) measures.push('motivierende Impulse zur Aufnahme der beschriebenen Tätigkeit geben');
  if (RESOURCE_RE.test(source)) measures.push('vorhandene selbstständige Anteile gezielt nutzen und erhalten');

  const unique = [...new Set(measures)];
  if (!unique.length) return 'Aus der Eingabe lassen sich noch keine konkreten geplanten Maßnahmen ableiten.';
  return unique.map((item) => `• ${item.charAt(0).toUpperCase()}${item.slice(1)}.`).join('\n');
}

function explicitProvider(allSentences) {
  const source = allSentences.join(' ');
  const match = source.match(/(?:durch|von)\s+(Mitarbeitende[n]?|Mitarbeiter(?:innen)?|Fachkräfte[n]?|Betreuer(?:innen)?|Pflegedienst|Tagesstätte|Arzt|Ärztin|Therapeut(?:in)?(?:nen)?)(?=[\s,.;]|$)/i);
  return match ? `Die weitere Maßnahme wird laut Eingabe durch ${match[1]} erbracht.` : 'Hierzu enthält die Eingabe keine eindeutige Angabe.';
}

function sectionFromMatches(allSentences, regex, missingText) {
  const selected = allSentences.filter((sentence) => regex.test(sentence));
  return selected.length ? joinSentences(selected) : missingText;
}

function formatA(allSentences) {
  return [
    'a) Aktuelle Situation / Problemlage unter Berücksichtigung der Ressourcen',
    joinSentences(allSentences),
    '',
    'b) Einschätzung des Hilfebedarfs',
    supportSummary(allSentences),
    '',
    'c) Rahmenziele',
    goalSummary(allSentences),
    '',
    'd) Geplante Maßnahmen',
    measuresSummary(allSentences),
  ].join('\n');
}

function formatB(allSentences) {
  return [
    'a) Reflexion der durchgeführten Maßnahmen',
    sectionFromMatches(allSentences, MEASURE_RE, 'Zu bereits durchgeführten Maßnahmen enthält die Eingabe keine eindeutige Angabe.'),
    '',
    'b) Beschreibung der Entwicklung im letzten Planungszeitraum',
    sectionFromMatches(allSentences, DEVELOPMENT_RE, 'Die Eingabe beschreibt keinen eindeutigen Verlauf oder Vergleich zum vorangegangenen Planungszeitraum. Eine Entwicklung wird daher nicht ergänzt.'),
    '',
    'c) Einschätzung des Hilfebedarfs',
    supportSummary(allSentences),
    '',
    'd) Fortschreibung der Rahmenziele',
    goalSummary(allSentences),
    '',
    'e) Geplante Maßnahmen',
    sectionFromMatches(allSentences, FUTURE_RE, measuresSummary(allSentences)),
  ].join('\n');
}

function formatC(allSentences) {
  return [
    'a) Reflexion der durchgeführten Maßnahmen',
    sectionFromMatches(allSentences, MEASURE_RE, 'Zu bereits durchgeführten Maßnahmen enthält die Eingabe keine eindeutige Angabe.'),
    '',
    'b) Beschreibung der Entwicklung im letzten Planungszeitraum',
    sectionFromMatches(allSentences, DEVELOPMENT_RE, 'Die Eingabe beschreibt keinen eindeutigen Verlauf oder Vergleich zum vorangegangenen Planungszeitraum. Eine Entwicklung wird daher nicht ergänzt.'),
    '',
    'c) Einschätzung des noch bestehenden Hilfebedarfs',
    supportSummary(allSentences),
    '',
    'd) Weitere vorgesehene Maßnahmen',
    sectionFromMatches(allSentences, FUTURE_RE, measuresSummary(allSentences)),
    '',
    'e) Durch wen werden diese Maßnahmen erbracht',
    explicitProvider(allSentences),
  ].join('\n');
}

export function formulateHebDraft({ notes, formType = 'A' }) {
  const parts = sentences(notes);
  if (!parts.length) throw new Error('Keine verwertbare Eingabe.');
  if (formType === 'B') return formatB(parts);
  if (formType === 'C') return formatC(parts);
  return formatA(parts);
}
