const detectors = [
  {
    key: 'email',
    label: 'E-Mail-Adresse',
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    key: 'phone',
    label: 'Telefonnummer',
    regex: /(?<!\d)(?:\+49|0049|0)\s*(?:\(?\d{2,5}\)?[\s/-]*)\d(?:[\s/-]*\d){5,10}(?!\d)/g,
  },
  {
    key: 'date',
    label: 'konkretes Datum',
    regex: /\b(?:0?[1-9]|[12]\d|3[01])[.\/-](?:0?[1-9]|1[0-2])[.\/-](?:19|20)\d{2}\b/g,
  },
  {
    key: 'address',
    label: 'mögliche Adresse',
    regex: /\b[A-ZÄÖÜ][A-Za-zÄÖÜäöüß.-]{2,}(?:straße|strasse|str\.|weg|platz|allee|gasse|ring)\s+\d{1,4}[a-zA-Z]?\b/gi,
  },
  {
    key: 'postcode',
    label: 'Postleitzahl',
    regex: /\b\d{5}\b/g,
  },
  {
    key: 'nameMarker',
    label: 'möglicher Personenname',
    regex: /\b(?:Herr|Frau|Hr\.|Fr\.|Name\s*:?|heißt|heisst)\s+[A-ZÄÖÜ][a-zäöüß-]{2,}(?:\s+[A-ZÄÖÜ][a-zäöüß-]{2,})?/g,
  },
  {
    key: 'insurance',
    label: 'mögliche Versicherungs-/Aktennummer',
    regex: /\b[A-Z]\d{8,12}\b/g,
  },
];

export function detectSensitiveData(text) {
  const findings = [];
  const source = text || '';

  for (const detector of detectors) {
    detector.regex.lastIndex = 0;
    const matches = [...source.matchAll(detector.regex)];
    if (matches.length) {
      findings.push({
        key: detector.key,
        label: detector.label,
        count: matches.length,
      });
    }
  }

  return findings;
}

export function privacyMessage(findings) {
  if (!findings.length) return '';
  const labels = [...new Set(findings.map((item) => item.label))];
  return `Eingabe blockiert: Es wurden mögliche personenbezogene Angaben erkannt (${labels.join(', ')}). Bitte entfernen oder so verallgemeinern, dass die Person nicht identifizierbar ist.`;
}
