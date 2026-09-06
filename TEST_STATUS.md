# HEB-Assist – Teststatus

Stand: 2026-09-06

## Verbindlicher Status

HEB-Assist ist weiterhin ein Test-/Entwicklungsprojekt. Bis zur fachlichen Freigabe dürfen ausschließlich vollständig synthetische Testfälle verwendet werden.

## Bereits grundsätzlich geprüft

- GitHub-Pages-Testseite ist erreichbar.
- mobile Darstellung wurde mehrfach auf einem realen iPhone geprüft.
- HEB A/B/C und die fünf offiziellen HEB-Hauptbereiche wurden anhand der bereitgestellten offiziellen Bögen abgeglichen.
- HEB-Eingaben bleiben gesperrt, bis das echte lokale Sprachmodell vollständig gestartet ist.
- kein externer KI-Inferenzserver und kein regel-/regexbasierter Ersatz-HEB.
- lokaler Datenschutzfilter für typische direkte Identifikatoren.
- automatischer Dark Mode.
- automatische PWA-Aktualisierung.
- Browser-Smoke-Tests für Chromium, WebKit sowie iPhone-/Android-ähnliche Viewports sind im GitHub-Workflow integriert.

## Bisherige reale iPhone-Modelltests

- größere lokale Modellvarianten führten teilweise zu Webseitenprozess-/Speicherproblemen.
- ein früherer **Qwen-2.5-1.5B-WebLLM**-Versuch war für den damaligen iOS-Test praktisch zu schwer.
- sehr kleine Modelle liefen stabiler, lieferten aber fachlich unbrauchbare Texte.
- **Llama 3.2 1B Instruct** startete vergleichsweise stabil, erzeugte jedoch mehrfach grammatikalisch und fachlich unbrauchbare HEB-Ausgaben.
- **Qwen 3 0.6B** mit Gesamtanalyse war ebenfalls nicht ausreichend. Die gewünschte fachliche Synthese war nicht zuverlässig, und die Kombination aus Thinking-Lauf plus zweitem KI-Prüflauf war auf dem realen iPhone zu langsam bzw. blieb für den Nutzer ohne brauchbare Fortschrittsanzeige lange im Zustand „KI formuliert …“.

Bewertung: **Qwen 3 0.6B wird für die eigentliche HEB-Generierung nicht weiterverwendet.**

## Neuer Entwicklungsstand: v10

v10 wechselt auf **Qwen 3 1.7B q4f16 über WebLLM 0.2.82**.

### Architektur

1. Die vollständige Eingabe wird zusammen mit HEB-Bogen, HEB-Bereich und allen offiziellen Unterpunkten in einem Modelllauf verarbeitet.
2. Qwen 3 1.7B nutzt Thinking/Reasoning für die fachliche Gesamtanalyse.
3. Die lokale KI soll Beziehungen zwischen Ressource, Unterstützungsbedarf und beschriebenen Unterstützungshandlungen selbst semantisch erkennen.
4. Die Eingabe wird lediglich für nachvollziehbare Beleg-IDs in Originalaussagen zerlegt; es gibt kein regelbasiertes Quellen-Routing mehr.
5. Jeder nicht fehlende Unterpunkt muss verwendete Originalbelege nennen.
6. Es gibt **keinen zweiten KI-Reviewer**. Nach dem Modelllauf prüft nur lokale Sicherheitslogik auf klar erkennbare unzulässige Inhalte oder Bedeutungsverschiebungen. Diese Logik erzeugt selbst keinen HEB-Text.
7. Die Generierung streamt lokal. Die Oberfläche zeigt einen bewegten Aktivitätsbalken, Bearbeitungszeit und die aktuelle Phase, damit laufende Berechnung und Hänger unterscheidbar sind.
8. Eine Generierung wird nach maximal drei Minuten abgebrochen, wenn sie nicht fertig wird. Es wird kein Ersatztext erzeugt.
9. Die WebLLM-JavaScript-Laufzeit wird beim Deploy lokal gebündelt und von der PWA gecacht; `esm.run` oder eine andere JavaScript-CDN ist für die Laufzeit nicht mehr vorgesehen.
10. Das neue Modell wird beim ersten Start separat geladen und von WebLLM lokal im Browser gespeichert.

### Erwartung für den bekannten synthetischen HEB-A-Testfall

Beim Testfall mit verbalem Impuls zur Aufnahme der Körperpflege muss v10 mindestens Folgendes leisten:

- a) Situation fachlich zusammenführen und die überwiegend selbstständige Durchführung als Ressource erhalten.
- b) Unterstützungsbedarf bei der **Initiierung** erkennen, ohne Hilfe bei der Durchführung zu erfinden.
- c) ohne ausdrücklich genanntes Ziel transparent fehlende Angaben ausgeben.
- d) die tatsächlich beschriebene Unterstützungshandlung fachlich benennen, ohne zusätzliche Maßnahmen zu erfinden.
- keine Diagnose, Ursache, Bewertung, Entwicklung oder formale Hilfebedarfsstufe ergänzen.
- keine Fantasiewörter, Wortwiederholungsschleifen oder kaputten Bindestrichketten.

## Automatisierte Tests für v10

Der GitHub-Pages-Workflow soll vor dem Deploy prüfen:

- npm-Abhängigkeiten und Build der lokal gebündelten WebLLM-Laufzeit
- JavaScript-Syntax
- bestehende synthetische Quellen-/Sicherheitsregressionen
- Reasoning-Parser-/Sicherheitsregressionen
- Browser-Smoke-Tests mit Chromium und WebKit
- iPhone-/Android-ähnliche Layouts
- HEB A/B/C und offizielle Hauptbereiche
- Sperre ohne gestartete echte KI
- Dark Mode
- Manifest und Service Worker
- lokale Erreichbarkeit von `vendor/webllm.js`
- keine externe JavaScript-CDN für die KI-Laufzeit im App-Shell-Test

## Für v10 noch offen

- GitHub-Actions-Lauf der v10-Änderung muss vollständig grün sein.
- GitHub Pages muss den v10-Stand erfolgreich veröffentlichen.
- Qwen 3 1.7B muss auf dem realen iPhone vollständig laden und ohne Safari-/Speicherabbruch starten.
- nach dem Erstdownload muss geprüft werden, ob ein erneuter Start aus dem lokalen Browsercache ohne erneuten vollständigen Modelldownload funktioniert.
- Offline-Test nach erfolgreichem Erstdownload steht aus.
- der bekannte synthetische HEB-A-Fall muss auf dem realen iPhone fachlich bewertet werden.
- Generierungsdauer und Verhalten des neuen Aktivitätsbalkens müssen auf dem realen iPhone geprüft werden.
- mehrere aufeinanderfolgende Generierungen auf realem iPhone müssen geprüft werden.
- HEB B muss mit einem synthetischen Verlaufsfall geprüft werden.
- HEB C muss mit einem synthetischen Abschlussfall geprüft werden.
- echter Android-WebGPU-Test steht aus.
- echter Desktop-WebGPU-Test steht aus.

## Freigaberegel

Bis diese Punkte fachlich und technisch ausreichend geprüft sind, keine echten Falldaten verwenden und keine produktive Freigabe behaupten.
