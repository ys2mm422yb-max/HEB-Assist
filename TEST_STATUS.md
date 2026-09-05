# HEB-Assist – Teststatus

Stand: 2026-09-06

## Bereits geprüft

- Datenschutzfilter mit vollständig synthetischen Beispielen geprüft:
  - normale HEB-Beschreibung: kein Treffer
  - E-Mail-Adresse: erkannt
  - Telefonnummer: erkannt
  - konkretes Datum: erkannt
  - Straßenadresse: erkannt
  - Postleitzahl: erkannt
  - Personenname nach Anrede: erkannt
  - typische Versicherungsnummer: erkannt
- GitHub-Pages-Testseite ist erreichbar.
- Reale Darstellung auf einem iPhone wurde geprüft.
- HEB A / B / C und die fünf offiziellen HEB-Bereiche wurden anhand der bereitgestellten bayerischen HEB-Bögen abgeglichen.
- Die App-Shell aktualisiert sich automatisch über GitHub Pages / Service Worker.
- Die eigentliche HEB-Eingabe bleibt bis zum vollständigen Start der lokalen KI gesperrt.

## Ergebnis der bisherigen iPhone-KI-Tests

### Größere Modelle / frühere Laufzeiten

- Mehrere größere lokale Modellvarianten konnten zwar geladen werden, führten auf dem getesteten iPhone/Safari aber beim Start oder bei der autoregressiven Generierung zu Webseitenprozess-Abbrüchen.
- Ein Qwen-2.5-1.5B-WebLLM-Versuch war für die praktische iOS-Speichergrenze zu schwer.

Ergebnis: Größer ist auf dem getesteten iPhone nicht automatisch besser; Stabilität und Speicherbedarf müssen real am Gerät geprüft werden.

### Sehr kleine Modelle

- Gemma 3 270M konnte stabiler laufen, erzeugte aber fachlich völlig unbrauchbare Wiederholungen und Fantasiewörter.
- Llama 3.2 1B läuft auf dem Gerät stabiler als die größeren getesteten Varianten.
- Im bisherigen freien Generierungsmodus erzeugte auch Llama 3.2 1B jedoch nicht akzeptable Ausgaben, u. a.:
  - erfundene Ursache „Ermüdung“
  - wertende Aussage „gute Idee für die Selbstversorgung“
  - ungrammatische Formulierungen wie „muss konkreten Hilfe leisten“
  - zerstörte Wort-/Zeichensetzungsmuster wie `im!!!!! -Fähigkeiten`
  - inhaltliche Verschiebung des Hilfebedarfs von der Initiierung zur Durchführung

Ergebnis: Freie HEB-Generierung durch ein kleines lokales 1B-Modell ist fachlich nicht zuverlässig genug.

## Aktueller Entwicklungsstand

HEB-Assist verwendet weiterhin **Llama 3.2 1B Instruct q4f16 über WebLLM 0.2.82**, aber die Generierungsarchitektur wurde erneut verschärft.

### Quellengebundene Mikro-Generierung mit Gegenprüfung

1. Die Nutzereingabe wird lokal in unveränderte Originalaussagen mit IDs (`S1`, `S2`, …) zerlegt.
2. Das vollständig gestartete lokale Sprachmodell darf zunächst nur vorhandene Quellen-IDs den offiziellen HEB-Unterpunkten zuordnen.
3. Nicht existierende oder vom Modell erfundene IDs werden verworfen.
4. Für die Formulierung erhält die KI immer nur **einen einzigen Originalbeleg**.
5. Aus diesem Beleg erzeugt sie genau einen kurzen Mikrosatz.
6. Harte lokale Regeln prüfen u. a. Ursachen, Bewertungen, Themenvermischung, Unterstützungsumfang, Zahlen, Zeichensetzung und Satzabschluss.
7. Danach prüft dasselbe echte lokale Sprachmodell den fertigen Mikrosatz nochmals ausschließlich auf Faktentreue gegenüber diesem einen Originalbeleg und antwortet intern nur mit JA/NEIN.
8. Nur doppelt bestandene Mikrosätze werden in den HEB-Unterpunkt übernommen.
9. Ein einzelner verworfener Mikrosatz verwirft nicht mehr automatisch den gesamten HEB-Entwurf. Bleibt für einen HEB-Unterpunkt jedoch keine sichere Formulierung übrig, wird der Entwurf weiterhin verworfen.
10. Es gibt keinen regel-/regexbasierten Ersatztext als vermeintliche KI-Ausgabe.

Die bisherige rein lexikalische Quellenprüfung war zu streng und hat auf dem realen iPhone auch dann den vollständigen Entwurf verworfen, wenn wahrscheinlich nur eine fachlich neutrale Paraphrase nicht wortgleich genug zur Quelle war. Deshalb dienen neue Inhaltswörter jetzt als Diagnosehinweis; die eigentliche semantische Belegtreue wird zusätzlich durch die lokale KI-Gegenprüfung abgesichert.

Zusätzliche fachliche Sperren:

- Eine bloße Situationsbeschreibung erzeugt kein Ziel.
- HEB B/C erhalten ohne tatsächlichen zeitlichen Vergleich keine erfundene Entwicklung.
- Unterstützung bei der Initiierung darf nicht in Unterstützung bei der Durchführung umgedeutet werden.
- Pflege-/medizinische Inhalte dürfen nur erscheinen, wenn sie tatsächlich in der Eingabe stehen.

## Automatisierte Regressionstests

Der GitHub-Pages-Workflow prüft vor dem Deploy:

- JavaScript-Syntax der relevanten App-Dateien
- synthetische Regressionstests der Quellenpipeline

Die Regressionstests prüfen aktuell insbesondere:

- der bekannte synthetische HEB-A-Testfall wird korrekt in sechs Originalaussagen zerlegt
- nicht existierende Quellen-IDs werden verworfen
- quellennahe und fachlich neutrale Paraphrasen wie „Initiierung“ werden nicht fälschlich blockiert
- belegte Formulierungen zum Umgang mit finanziellen Mitteln werden akzeptiert
- die erfundene Ursache „Ermüdung“ wird verworfen
- Unterstützung beim Beginn darf nicht in Unterstützung bei der Durchführung umgedeutet werden
- Inhalte aus verschiedenen Originalaussagen dürfen nicht vermischt werden
- „gute Idee“-Bewertungen werden verworfen
- degenerierte Zeichensetzung / kaputte Grammatikmuster werden verworfen

Ein fehlgeschlagener Regressionstest verhindert den GitHub-Pages-Deploy.

## Darstellung

- Ein automatischer Dark Mode ist implementiert. Die App folgt über `prefers-color-scheme` dem Systemmodus von iOS, Android oder Desktop.
- Helle und dunkle Browser-/PWA-Theme-Farben sind im HTML hinterlegt.
- Der Dark Mode ist technisch deployed, aber noch nicht auf dem realen iPhone visuell bestätigt.

## Noch nicht geprüft / keine Freigabe

- neue KI-Gegenprüfung noch nicht mit dem bisherigen synthetischen HEB-A-Testfall auf dem realen iPhone bestätigt
- fachliche Qualität der neuen HEB-A-Ausgabe noch nicht bewertet
- Dark Mode noch nicht auf dem realen iPhone visuell bewertet
- Stabilität mehrerer aufeinanderfolgender Generierungen noch nicht bewertet
- HEB B noch nicht mit synthetischem Verlaufsfall bewertet
- HEB C noch nicht mit synthetischem Abschlussfall bewertet
- kein realer Android-Test
- kein systematischer Desktop-Test
- keine produktive Freigabe für echte Falldaten

## Freigaberegel

Bis die offenen Punkte geprüft sind, darf HEB-Assist ausschließlich mit vollständig synthetischen Testfällen verwendet werden.
