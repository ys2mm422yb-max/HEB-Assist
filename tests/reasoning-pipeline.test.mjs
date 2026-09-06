import assert from 'node:assert/strict';
import {
  parseReasonedSections,
  evidenceTextsForSection,
  stripThinkingContent,
  validateReasonedSection,
} from '../reasoning-pipeline.js';

const units = [
  { id: 'S1', text: 'Die Person benötigt morgens häufig einen verbalen Impuls, um mit der Körperpflege zu beginnen.' },
  { id: 'S2', text: 'Nach der Erinnerung wählt sie die benötigten Pflegeprodukte selbst aus und führt die Körperpflege überwiegend selbstständig durch.' },
  { id: 'S3', text: 'An einzelnen Tagen lehnt sie die Körperpflege zunächst ab und nimmt sie nach einem späteren erneuten Angebot auf.' },
  { id: 'S4', text: 'Einkäufe werden gemeinsam geplant.' },
  { id: 'S5', text: 'Die benötigten Produkte sucht die Person im Geschäft selbst aus.' },
  { id: 'S6', text: 'Beim Umgang mit Geld benötigt sie Unterstützung, um die verfügbaren finanziellen Mittel im Blick zu behalten.' },
];

const raw = `<think>Interne Analyse, die nicht in der sichtbaren Ausgabe bleiben darf.</think>
<SECTION_A>
STATUS:supported
EVIDENCE:S1,S2,S3,S99
TEXT:Zur Initiierung der Körperpflege benötigt die Person morgens häufig einen verbalen Impuls. Im Anschluss führt sie die Körperpflege überwiegend selbstständig durch.
</SECTION_A>
<SECTION_B>
STATUS:supported
EVIDENCE:S1,S6
TEXT:Unterstützungsbedarf besteht bei der Initiierung der Körperpflege sowie beim Behalten des Überblicks über die verfügbaren finanziellen Mittel.
</SECTION_B>
<SECTION_C>
STATUS:missing
EVIDENCE:
TEXT:Hierzu liegen keine ausreichenden Angaben vor.
</SECTION_C>
<SECTION_D>
STATUS:context_only
EVIDENCE:S1,S3,S4,S6
TEXT:Aktuell erfolgen verbale Impulse, erneute Angebote und gemeinsame Einkaufsplanung; eine Fortführung im Planungszeitraum ist aus den Angaben nicht ausdrücklich belegt.
</SECTION_D>`;

assert.doesNotMatch(stripThinkingContent(raw), /Interne Analyse/);

const parsed = parseReasonedSections(raw, units, 'A');
assert.equal(parsed.sections.a.status, 'supported');
assert.deepEqual(parsed.sections.a.evidence, ['S1', 'S2', 'S3'], 'Erfundene Quellen-IDs müssen verworfen werden.');
assert.equal(parsed.sections.b.status, 'supported');
assert.deepEqual(parsed.sections.b.evidence, ['S1', 'S6']);
assert.equal(parsed.sections.c.status, 'missing');
assert.deepEqual(parsed.sections.c.evidence, []);
assert.equal(parsed.sections.d.status, 'context_only');

assert.deepEqual(
  evidenceTextsForSection(parsed, units, 'b'),
  [units[0].text, units[5].text],
  'Nur tatsächlich referenzierte Originalaussagen dürfen als Beleg verwendet werden.',
);

const supported = validateReasonedSection(
  parsed.sections.b.text,
  evidenceTextsForSection(parsed, units, 'b'),
  { maxWords: 65 },
);
assert.equal(supported.ok, true, `Belegter Hilfebedarf wurde fälschlich verworfen: ${supported.reasons?.join(', ')}`);

const inverted = validateReasonedSection(
  'Keine Selbstversorgung ist notwendig.',
  [units[0].text, units[1].text],
  { maxWords: 20 },
);
assert.equal(inverted.ok, false, 'Die bekannte falsche Negation aus dem realen iPhone-Test muss blockiert werden.');

const deniedSupport = validateReasonedSection(
  'Es besteht kein Unterstützungsbedarf.',
  [units[0].text, units[5].text],
  { maxWords: 20 },
);
assert.equal(deniedSupport.ok, false, 'Explizit belegter Unterstützungsbedarf darf nicht verneint werden.');

const metaList = validateReasonedSection(
  'Keine neuen Maßnahmen, keine neuen Ziele, keine neuen Hilfebedarfsstufen.',
  [units[0].text],
  { maxWords: 20 },
);
assert.equal(metaList.ok, false, 'Metaartige Negativlisten dürfen nicht als fachlicher HEB erscheinen.');

const unsupportedFormalLevel = validateReasonedSection(
  'Begleitende, übende Unterstützung ist erforderlich.',
  [units[0].text],
  { maxWords: 20 },
);
assert.equal(unsupportedFormalLevel.ok, false, 'Eine formale Hilfebedarfsstufe darf ohne ausdrückliche Quelle nicht gewählt werden.');

const missingWithoutEvidence = parseReasonedSections(
  `<SECTION_A>\nSTATUS:supported\nEVIDENCE:\nTEXT:Fachlicher Text ohne Beleg.\n</SECTION_A>`,
  units,
  'A',
);
assert.equal(missingWithoutEvidence.sections.a.status, 'ambiguous', 'Ein sichtbarer Text ohne gültige Beleg-ID darf nicht als supported gelten.');

console.log('reasoning-pipeline: alle synthetischen Regressionstests bestanden');
