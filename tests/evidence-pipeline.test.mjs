import assert from 'node:assert/strict';
import {
  splitEvidenceUnits,
  parseEvidenceClassification,
  validateAnchoredHebText,
} from '../evidence-pipeline.js';
import { selectEvidenceForSection } from '../evidence-router.js';

const synthetic = 'Die Person benötigt morgens häufig einen verbalen Impuls, um mit der Körperpflege zu beginnen. Nach der Erinnerung wählt sie die benötigten Pflegeprodukte selbst aus und führt die Körperpflege überwiegend selbstständig durch. An einzelnen Tagen lehnt sie die Körperpflege zunächst ab und nimmt sie nach einem späteren erneuten Angebot auf. Einkäufe werden gemeinsam geplant. Die benötigten Produkte sucht die Person im Geschäft selbst aus. Beim Umgang mit Geld benötigt sie Unterstützung, um die verfügbaren finanziellen Mittel im Blick zu behalten.';

const units = splitEvidenceUnits(synthetic);
assert.equal(units.length, 6, 'Der bekannte synthetische Testfall muss in sechs Originalaussagen zerlegt werden.');
assert.equal(units[0].id, 'S1');
assert.match(units[0].text, /verbalen Impuls/);

const classification = parseEvidenceClassification(
  'current=S1,S2,S99\nsupport=S1,S6\ngoals=\nmeasures=S1,S3,S4',
  ['current', 'support', 'goals', 'measures'],
  units,
  { current: 2, support: 2, goals: 1, measures: 2 },
);
assert.deepEqual(classification.current, ['S1', 'S2'], 'Nicht existierende IDs und IDs oberhalb des Limits müssen verworfen werden.');
assert.deepEqual(classification.support, ['S1', 'S6']);
assert.deepEqual(classification.goals, []);
assert.deepEqual(classification.measures, ['S1', 'S3']);

// v8: Das lokale Routing erzeugt keinen Text, sondern reduziert nur die
// Originalquellen für den jeweiligen HEB-Unterpunkt.
const currentIds = selectEvidenceForSection(units, 'A', 'current').map((unit) => unit.id);
const supportIds = selectEvidenceForSection(units, 'A', 'support').map((unit) => unit.id);
const goalIds = selectEvidenceForSection(units, 'A', 'goals').map((unit) => unit.id);
const measureIds = selectEvidenceForSection(units, 'A', 'measures').map((unit) => unit.id);

assert.deepEqual(currentIds, ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
assert.ok(supportIds.includes('S1'), 'Der verbale Impuls zum Beginn muss als Unterstützungsbeleg geroutet werden.');
assert.ok(supportIds.includes('S3'), 'Das spätere erneute Angebot muss als Unterstützungsbeleg geroutet werden.');
assert.ok(supportIds.includes('S6'), 'Explizite Unterstützung beim Umgang mit Geld muss als Unterstützungsbeleg geroutet werden.');
assert.deepEqual(goalIds, [], 'Ohne ausdrückliches Ziel darf kein Zielbeleg entstehen.');
assert.ok(measureIds.includes('S1'), 'Der beschriebene verbale Impuls muss als konkrete Unterstützungshandlung geroutet werden.');
assert.ok(measureIds.includes('S2'), 'Die beschriebene Erinnerung muss als konkrete Unterstützungshandlung geroutet werden.');
assert.ok(measureIds.includes('S3'), 'Das beschriebene erneute Angebot muss als konkrete Unterstützungshandlung geroutet werden.');
assert.ok(measureIds.includes('S4'), 'Die gemeinsame Einkaufsplanung muss als konkrete Unterstützungshandlung geroutet werden.');
assert.ok(!measureIds.includes('S6'), 'Ein bloßer Unterstützungsbedarf darf ohne beschriebene Handlung nicht automatisch zur Maßnahme werden.');

const safe = validateAnchoredHebText(
  'Zur Aufnahme der Körperpflege benötigt die Person morgens häufig einen verbalen Impuls.',
  [units[0].text],
  { maxWords: 20 },
);
assert.equal(safe.ok, true, `Quellennahe fachliche Umformulierung wurde fälschlich verworfen: ${safe.reasons.join(', ')}`);

const safeInitiation = validateAnchoredHebText(
  'Zur Initiierung der Körperpflege benötigt die Person morgens häufig einen verbalen Impuls.',
  [units[0].text],
  { maxWords: 20 },
);
assert.equal(safeInitiation.ok, true, `Neutrale fachliche Paraphrase wurde fälschlich verworfen: ${safeInitiation.reasons.join(', ')}`);

const safeFinances = validateAnchoredHebText(
  'Beim Umgang mit den verfügbaren finanziellen Mitteln benötigt die Person Unterstützung.',
  [units[5].text],
  { maxWords: 20 },
);
assert.equal(safeFinances.ok, true, `Belegte Finanz-Formulierung wurde fälschlich verworfen: ${safeFinances.reasons.join(', ')}`);

const inventedCause = validateAnchoredHebText(
  'Die Person hat aufgrund von Ermüdung Schwierigkeiten mit der Körperpflege.',
  [units[0].text],
  { maxWords: 20 },
);
assert.equal(inventedCause.ok, false, 'Eine erfundene Ursache muss verworfen werden.');

const wrongScope = validateAnchoredHebText(
  'Die Person benötigt Unterstützung, um die Körperpflege selbstständig durchzuführen.',
  [units[0].text],
  { maxWords: 20 },
);
assert.equal(wrongScope.ok, false, 'Unterstützung bei der Initiierung darf nicht zu Unterstützung bei der Durchführung umgedeutet werden.');

const crossMix = validateAnchoredHebText(
  'Die Körperpflege wird gemeinsam geplant.',
  [units[3].text],
  { maxWords: 20 },
);
assert.equal(crossMix.ok, false, 'Inhalte aus einer anderen Originalaussage dürfen nicht in den Beleg hineingemischt werden.');

const evaluative = validateAnchoredHebText(
  'Die gemeinsame Einkaufsplanung ist eine gute Idee für die Selbstversorgung.',
  [units[3].text],
  { maxWords: 20 },
);
assert.equal(evaluative.ok, false, 'Wertende Aussagen müssen verworfen werden.');

const broken = validateAnchoredHebText(
  'Sie muss konkreten Hilfe leisten, insbesondere im!!!!! -Fähigkeiten.',
  [units[0].text],
  { maxWords: 20 },
);
assert.equal(broken.ok, false, 'Degenerierte Grammatik/Zeichensetzung muss verworfen werden.');

console.log('evidence-pipeline: alle synthetischen Regressionstests bestanden');
