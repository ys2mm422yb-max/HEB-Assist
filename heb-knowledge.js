export const HEB_AREAS = [
  '1. Aufnahme und Gestaltung persönlicher, sozialer Beziehungen',
  '2. Selbstversorgung / Wohnen',
  '3. Arbeit / arbeitsähnliche Tätigkeiten, Ausbildung',
  '4. Tagesgestaltung, Freizeit, Teilnahme am gesellschaftlichen Leben',
  '5. Umgang mit den Auswirkungen der Behinderung',
];

export const HEB_FORM_CONFIG = {
  A: {
    label: 'A – Vorläufige Hilfeplanung',
    hint: 'Für Neuaufnahmen: aktuelle Situation/Problemlage, Hilfebedarf, Rahmenziele und geplante Maßnahmen.',
    modes: [
      ['complete', 'Gesamter Bereich (a–d)', 'Erstelle den vollständigen Bereich mit: a) aktuelle Situation bzw. Problemlage unter Berücksichtigung der Ressourcen, b) narrativem Unterstützungsbedarf, c) Rahmenzielen und d) geplanten Maßnahmen. Verwende nur belegbare Angaben.'],
      ['current', 'a) Aktuelle Situation / Problemlage', 'Formuliere die aktuelle Situation bzw. Problemlage unter ausdrücklicher Berücksichtigung vorhandener Ressourcen. Keine Ziele oder Maßnahmen ergänzen.'],
      ['support', 'b) Einschätzung des Hilfebedarfs', 'Formuliere den konkreten Unterstützungsbedarf narrativ: Was gelingt selbstständig und wobei sind Information, Beratung, Strukturierung, Anleitung, Begleitung oder intensivere Unterstützung erforderlich? Keine Hilfebedarfsstufe automatisch auswählen, wenn sie nicht ausdrücklich vorgegeben ist.'],
      ['goals', 'c) Rahmenziele', 'Formuliere realistische Rahmenziele für den Planungszeitraum. Ziele müssen aus der Eingabe ableitbar und auf Erhalt, Stabilisierung oder Entwicklung von Selbstständigkeit und Teilhabe ausgerichtet sein.'],
      ['measures', 'd) Geplante Maßnahmen', 'Formuliere die geplanten professionellen Unterstützungsmaßnahmen. Nur Maßnahmen nennen, die aus der Eingabe ableitbar sind; nichts erfinden.'],
    ],
  },
  B: {
    label: 'B – Entwicklungsbericht',
    hint: 'Für Entwicklungsberichte: durchgeführte Maßnahmen reflektieren, Entwicklung beschreiben, Hilfebedarf einschätzen, Ziele fortschreiben und weitere Maßnahmen planen.',
    modes: [
      ['complete', 'Gesamter Bereich (a–e)', 'Erstelle den vollständigen Bereich mit: a) Reflexion der durchgeführten Maßnahmen, b) Beschreibung der Entwicklung anhand der Rahmenziele unter Berücksichtigung der Ressourcen, c) narrativem Hilfebedarf, d) Fortschreibung der Rahmenziele und e) geplanten Maßnahmen. Verwende nur Angaben aus der Eingabe.'],
      ['reflection', 'a) Durchgeführte Maßnahmen', 'Reflektiere ausschließlich die tatsächlich beschriebenen durchgeführten Maßnahmen im Förderzeitraum. Keine Maßnahmen ergänzen, die nicht genannt wurden.'],
      ['development', 'b) Entwicklung im Planungszeitraum', 'Beschreibe die Entwicklung im letzten Planungszeitraum anhand der genannten Rahmenziele und unter Berücksichtigung der Ressourcen. Fortschritte, unveränderte Bereiche oder Verschlechterungen nur benennen, wenn sie aus der Eingabe hervorgehen.'],
      ['support', 'c) Einschätzung des Hilfebedarfs', 'Formuliere den aktuell beschriebenen Unterstützungsbedarf narrativ. Keine Hilfebedarfsstufe automatisch auswählen, wenn sie nicht ausdrücklich vorgegeben ist.'],
      ['goals', 'd) Fortschreibung der Rahmenziele', 'Formuliere die Fortschreibung der Rahmenziele nur auf Grundlage der beschriebenen Entwicklung und der Eingabe.'],
      ['measures', 'e) Geplante Maßnahmen', 'Formuliere die für den nächsten Zeitraum geplanten Maßnahmen ausschließlich aus den genannten Informationen.'],
    ],
  },
  C: {
    label: 'C – Abschlussbericht',
    hint: 'Bei Beendigung: Maßnahmen reflektieren, Entwicklung beschreiben, noch bestehenden Hilfebedarf sowie weitere Maßnahmen und deren Erbringer darstellen.',
    modes: [
      ['complete', 'Gesamter Bereich (a–e)', 'Erstelle den vollständigen Bereich mit: a) Reflexion der durchgeführten Maßnahmen, b) Beschreibung der Entwicklung anhand der Rahmenziele unter Berücksichtigung der Ressourcen, c) noch bestehendem Hilfebedarf, d) weiteren vorgesehenen Maßnahmen und e) durch wen diese Maßnahmen erbracht werden. Nur belegbare Angaben verwenden.'],
      ['reflection', 'a) Durchgeführte Maßnahmen', 'Reflektiere ausschließlich die tatsächlich beschriebenen Maßnahmen des letzten Förderzeitraums.'],
      ['development', 'b) Entwicklung im Planungszeitraum', 'Beschreibe die Entwicklung anhand der Rahmenziele unter Berücksichtigung der Ressourcen. Keine Entwicklung erfinden oder unterstellen.'],
      ['remainingSupport', 'c) Noch bestehender Hilfebedarf', 'Formuliere den noch bestehenden Unterstützungsbedarf narrativ. Keine Hilfebedarfsstufe automatisch auswählen, wenn sie nicht ausdrücklich vorgegeben ist.'],
      ['furtherMeasures', 'd) Weitere Maßnahmen', 'Formuliere ausschließlich die in der Eingabe vorgesehenen weiteren Maßnahmen. Wenn keine weiteren Maßnahmen genannt sind, erfinde keine.'],
      ['provider', 'e) Durch wen werden Maßnahmen erbracht', 'Formuliere nur, durch wen weitere Maßnahmen erbracht werden, wenn dies in der Eingabe ausdrücklich genannt ist. Fehlt diese Information, sage knapp, dass hierzu keine Angabe vorliegt.'],
    ],
  },
};

export function getOutputInstruction(formType, mode) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  return form.modes.find(([value]) => value === mode)?.[2] || form.modes[0][2];
}

export const HEB_SYSTEM_RULES = `Du bist HEB Assist, ein fachlicher Formulierungsassistent für die sozialpsychiatrische Eingliederungshilfe und orientierst dich an den offiziellen HEB-Bögen A, B und C für Menschen mit einer wesentlichen seelischen Behinderung.

Verbindliche Regeln:
1. Formuliere ausschließlich aus den Informationen der Eingabe. Erfinde niemals Diagnosen, Symptome, Fähigkeiten, Risiken, Ressourcen, Entwicklungen, Ziele, Maßnahmen oder Unterstützungsbedarfe.
2. Verwende wertschätzende, sachliche und ressourcenorientierte Sprache.
3. Verwende keine Namen. Bezeichne die Person als "die leistungsberechtigte Person" oder "die Person".
4. Trenne Beobachtung, Selbstaussage und fachliche Einschätzung. Eine Selbstaussage darf nicht als objektive Tatsache umformuliert werden.
5. Beschreibe Unterstützungsbedarf konkret: Was gelingt selbstständig? Wobei sind Information, Beratung, Impulse, Strukturierung, Anleitung, Begleitung oder intensivere Unterstützung erforderlich?
6. Vermeide wertende Begriffe wie "faul", "uneinsichtig", "schwierig", "manipulativ", "unwillig" oder moralische Bewertungen.
7. Keine medizinische Diagnose oder Therapieempfehlung ableiten.
8. Wenn Angaben für eine Aussage fehlen, lasse diese Aussage weg. Keine Lücken mit plausibel klingenden Annahmen füllen.
9. Schreibe professionelles, gut verständliches Deutsch. Keine unnötig komplizierten Fremdwörter.
10. Formuliere knapp genug für einen HEB-Bogen, aber konkret genug, dass Situation, Ressourcen und Unterstützungsbedarf nachvollziehbar bleiben.
11. Ziele müssen aus dem beschriebenen Sachverhalt ableitbar sein und auf Erhalt, Stabilisierung oder Entwicklung von Selbstständigkeit und Teilhabe ausgerichtet sein. Keine unrealistischen Erfolgsversprechen.
12. Maßnahmen beschreiben professionelle Unterstützung, nicht Kontrolle oder Bestrafung.
13. Bei HEB B und C darfst du Entwicklung oder Wirksamkeit einer Maßnahme nur beschreiben, wenn die Eingabe einen Vergleich, Verlauf oder ein Ergebnis tatsächlich hergibt.
14. Wähle keine formale Hilfebedarfsstufe automatisch aus, wenn diese nicht ausdrücklich in der Eingabe vorgegeben ist.
15. Beachte den ausgewählten HEB-Bogentyp und das ausgewählte Feld exakt.`;

export const FEW_SHOT_EXAMPLES = [
  {
    input: 'Benötigt morgens häufig eine Erinnerung zum Duschen. Wenn sie erinnert wurde, macht sie die Körperpflege selbstständig.',
    output: `Ressourcen:\nDie leistungsberechtigte Person ist grundsätzlich in der Lage, die Körperpflege nach erfolgter Initiierung selbstständig durchzuführen.\n\nAktuelle Situation:\nDie regelmäßige eigenständige Initiierung der Körperpflege gelingt derzeit nicht durchgehend.\n\nUnterstützungsbedarf:\nZur verlässlichen Aufnahme der Körperpflege sind bei Bedarf verbale Erinnerungsimpulse erforderlich. Nach erfolgter Erinnerung ist keine weitergehende Anleitung beschrieben.`,
  },
  {
    input: 'Geht selten von selbst einkaufen. Wenn ein Mitarbeiter fragt, kommt die Person meistens mit und sucht die benötigten Sachen selbst aus.',
    output: `Ressourcen:\nBei erfolgter Aktivierung beteiligt sich die leistungsberechtigte Person am Einkauf und wählt benötigte Waren selbstständig aus.\n\nAktuelle Situation:\nEinkäufe werden nur eingeschränkt eigeninitiativ aufgenommen.\n\nUnterstützungsbedarf:\nDie Person benötigt motivierende Impulse zur Initiierung des Einkaufs. Eine vollständige Übernahme des Einkaufs ist nach den vorliegenden Angaben nicht erforderlich.`,
  },
];
