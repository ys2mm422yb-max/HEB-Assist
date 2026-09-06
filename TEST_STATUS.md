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
- GitHub-Pages-Testseite ist grundsätzlich erreichbar.
- Reale Darstellung auf einem iPhone wurde mehrfach geprüft.
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

### Frühere quellengebundene Pipeline

- Die harte Quellenbindung verhinderte, dass schlechter KI-Text angezeigt wurde.
- Im realen iPhone-Test wurde der bekannte synthetische HEB-A-Testfall jedoch wiederholt vollständig verworfen und nur die Meldung „Der erzeugte Text hat die Qualitätsprüfung nicht bestanden“ angezeigt.
- Spätere Zwischenstände reduzierten diese Totalverwerfung, konnten auf iOS aber zu sehr vielen seriellen Modellaufrufen und damit zu minutenlangem scheinbarem Hängen führen.

## Aktueller Entwicklungsstand

HEB-Assist verwendet weiterhin **Llama 3.2 1B Instruct q4f16 über WebLLM 0.2.82** mit einem Kontextfenster von 2048 Tokens. Die aktuelle Generierungsarchitektur ist **v7**.

### Quellengebundene v7-Pipeline

1. Die Nutzereingabe wird lokal in unveränderte Originalaussagen zerlegt.
2. Pro offiziellem HEB-Unterpunkt gibt es genau **einen** Generierungsaufruf.
3. Danach gibt es genau **eine** lokale semantische Gegenprüfung für diesen Unterpunkt.
4. Es gibt keine Kaskade mehr aus separater Quellenwahl, mehreren Mikrosätzen und Wiederholungsversuchen.
5. Harte lokale Regeln blockieren u. a. erfundene Ursachen, neue Zahlen, Bedeutungsverschiebungen, Bewertungen, degenerierte Sprache und bekannte Fehlmuster.
6. Ein unsicherer Unterpunkt verwirft nicht automatisch den gesamten HEB; nur der betroffene Unterpunkt wird als nicht sicher formulierbar markiert.
7. Fehlende Ziele oder fehlende Verlaufsangaben werden transparent als fehlende Information behandelt, statt erfunden zu werden.
8. Es gibt weiterhin keinen regelbasierten Ersatz-HEB und keine externe KI-Inferenz.

Zusätzliche fachliche Sperren:

- Eine bloße Situationsbeschreibung erzeugt kein Ziel.
- HEB B/C erhalten ohne tatsächlichen zeitlichen Vergleich keine erfundene Entwicklung.
- Unterstützung bei der Initiierung darf nicht in Unterstützung bei der Durchführung umgedeutet werden.
- Pflege-/medizinische Inhalte dürfen nur erscheinen, wenn sie tatsächlich in der Eingabe stehen.
- Vorhandene Selbstständigkeit darf nicht abgeschwächt werden.
- Keine formale Hilfebedarfsstufe ohne ausdrückliche Angabe.

## Automatisierte Regressionstests

Der GitHub-Pages-Workflow prüft vor dem Deploy:

- JavaScript-Syntax der relevanten App-Dateien
- synthetische Regressionstests der Quellenpipeline
- Browser-Smoke-Tests mit Playwright in:
  - Desktop Chromium
  - Desktop WebKit
  - Android-ähnlichem mobilem Chromium-Viewport
  - iPhone-ähnlichem mobilem WebKit-Viewport
- Erreichbarkeit von Manifest und Service Worker
- HEB A/B/C und alle fünf offiziellen Hauptbereiche
- Sperre der Eingabe ohne vollständig gestartetes Sprachmodell
- keine rohen englischen Modellmeldungen in der Lade-/Fehleroberfläche
- Dark Mode über den Systemmodus
- horizontale Viewport-Überläufe auf mobilen Ansichten

Ein fehlgeschlagener relevanter Test verhindert den GitHub-Pages-Deploy.

### Letzter bestätigter Browserlauf vor dem aktuellen Fix

- 16 Browser-Smoke-Tests wurden gestartet.
- 15 Tests bestanden.
- Der iPhone-ähnliche WebKit-Test meldete einen horizontalen Overflow von **170 px**.
- Der GitHub-Pages-Deploy wurde deshalb korrekt blockiert und der fehlerhafte Stand nicht veröffentlicht.
- Als Gegenmaßnahme wurde eine zusätzliche mobile CSS-Schutzschicht (`mobile-fixes.css`) ergänzt, die insbesondere intrinsische Mindestbreiten von Selects und flexiblen Layout-Elementen auf iOS begrenzt.
- Dieser Fix gilt erst als bestätigt, wenn der nachfolgende GitHub-Actions-Lauf vollständig grün ist und Pages erfolgreich deployed wurde.

## Darstellung

- Ein automatischer Dark Mode ist implementiert. Die App folgt über `prefers-color-scheme` dem Systemmodus von iOS, Android oder Desktop.
- Helle und dunkle Browser-/PWA-Theme-Farben sind im HTML hinterlegt.
- Der Dark Mode ist automatisiert geprüft, aber noch nicht auf dem realen iPhone visuell abschließend bestätigt.

## Noch nicht geprüft / keine Freigabe

- v7-Pipeline noch nicht mit dem bekannten synthetischen HEB-A-Testfall auf dem realen iPhone erfolgreich abgeschlossen
- fachliche Qualität der v7-HEB-A-Ausgabe noch nicht bewertet
- Stabilität mehrerer aufeinanderfolgender Generierungen noch nicht bewertet
- Dark Mode noch nicht auf dem realen iPhone visuell abschließend bewertet
- HEB B noch nicht mit synthetischem Verlaufsfall bewertet
- HEB C noch nicht mit synthetischem Abschlussfall bewertet
- kein realer Android-Gerätetest
- kein realer Desktop-WebGPU-Test der vollständigen lokalen KI-Generierung
- keine produktive Freigabe für echte Falldaten

## Freigaberegel

Bis die offenen Punkte geprüft sind, darf HEB-Assist ausschließlich mit vollständig synthetischen Testfällen verwendet werden.
