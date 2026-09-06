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
- Im früheren freien Generierungsmodus erzeugte auch Llama 3.2 1B nicht akzeptable Ausgaben, u. a.:
  - erfundene Ursache „Ermüdung“
  - wertende Aussage „gute Idee für die Selbstversorgung“
  - ungrammatische Formulierungen wie „muss konkreten Hilfe leisten“
  - zerstörte Wort-/Zeichensetzungsmuster wie `im!!!!! -Fähigkeiten`
  - inhaltliche Verschiebung des Hilfebedarfs von der Initiierung zur Durchführung

Ergebnis: Freie HEB-Generierung durch ein kleines lokales 1B-Modell ist fachlich nicht zuverlässig genug.

### Quellengebundene v4-Pipeline

- Die harte Quellenbindung verhinderte, dass schlechter KI-Text angezeigt wurde.
- Im realen iPhone-Test wurde der bekannte synthetische HEB-A-Testfall jedoch wiederholt vollständig verworfen und nur die Meldung „Der erzeugte Text hat die Qualitätsprüfung nicht bestanden“ angezeigt.
- Damit war die Pipeline fachlich sicherer, praktisch aber noch zu streng und nicht ausreichend nutzbar.

## Aktueller Entwicklungsstand

HEB-Assist verwendet weiterhin **Llama 3.2 1B Instruct q4f16 über WebLLM 0.2.82**. Die Generierungsarchitektur ist jetzt auf v5 umgestellt.

### Quellengebundene v5-Pipeline

1. Die Nutzereingabe wird lokal in unveränderte Originalaussagen mit IDs (`S1`, `S2`, …) zerlegt.
2. Das vollständig gestartete lokale Sprachmodell ordnet ausschließlich vorhandene Quellen-IDs den offiziellen HEB-Unterpunkten zu.
3. Für jede Formulierung erhält die KI genau einen Originalbeleg.
4. Harte lokale Regeln blockieren u. a. erfundene Ursachen, neue Zahlen, Bedeutungsverschiebungen, Bewertungen, degenerierte Sprache und bekannte Fehlmuster.
5. Eine zweite lokale KI-Gegenprüfung wird nur noch bei rein lexikalischer Unsicherheit eingesetzt. Harte Fehler können dadurch nicht überstimmt werden.
6. Scheitert eine sichere Umformulierung mehrfach, darf ausschließlich der unveränderte Originalbeleg übernommen werden, sofern er selbst ein vollständiger und unauffälliger Satz ist.
7. Diese Originalbeleg-Übernahme ist keine erfundene Ersatzformulierung; sie enthält exakt die Nutzereingabe und verhindert, dass ein fachlich korrekter Beleg nur wegen misslungener Paraphrasierung verloren geht.
8. Kann auch der Originalbeleg nicht sicher verwendet werden, wird nur der betreffende Unterpunkt transparent als nicht sicher formulierbar markiert. Ein einzelner problematischer Mikrosatz verwirft nicht mehr automatisch den gesamten HEB.
9. Es wird niemals ein frei erfundener regel-/regexbasierter Ersatzinhalt erzeugt.

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
- quellennahe und fachlich neutrale Paraphrasen werden nicht fälschlich blockiert
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

- v5-Pipeline noch nicht mit dem bekannten synthetischen HEB-A-Testfall auf dem realen iPhone bestätigt
- fachliche Qualität der v5-HEB-A-Ausgabe noch nicht bewertet
- Dark Mode noch nicht auf dem realen iPhone visuell bewertet
- Stabilität mehrerer aufeinanderfolgender Generierungen noch nicht bewertet
- HEB B noch nicht mit synthetischem Verlaufsfall bewertet
- HEB C noch nicht mit synthetischem Abschlussfall bewertet
- kein realer Android-Test
- kein systematischer Desktop-Test
- keine produktive Freigabe für echte Falldaten

## Freigaberegel

Bis die offenen Punkte geprüft sind, darf HEB-Assist ausschließlich mit vollständig synthetischen Testfällen verwendet werden.
