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

## Bisherige Modelltests auf iPhone/Safari

- größere lokale Modellvarianten führten teilweise zu Webseitenprozess-/Speicherproblemen.
- ein früherer **Qwen-2.5-1.5B-WebLLM**-Versuch war für die praktische iOS-Speichergrenze zu schwer.
- sehr kleine Modelle liefen stabiler, lieferten aber fachlich unbrauchbare Texte.
- **Llama 3.2 1B Instruct** lief stabiler, war bei freier fachlicher HEB-Generierung aber nicht zuverlässig genug.

## Reale iPhone-Bewertung von v8: nicht ausreichend

Der vollständig synthetische HEB-A-Testfall „Selbstversorgung / Wohnen“ wurde auf dem realen iPhone geprüft.

Ergebnis:

- a) gab im Wesentlichen eine verkürzte Wiedergabe der Eingabe aus. Die Formulierung war quellengetreu, aber zu wenig fachlich synthetisiert.
- b) erzeugte **„Keine Selbstversorgung ist notwendig.“** Obwohl in der Eingabe ein verbaler Impuls zur Initiierung der Körperpflege und Unterstützung beim finanziellen Überblick ausdrücklich beschrieben waren. Das ist fachlich falsch.
- c) meldete korrekt fehlende Angaben, weil kein Rahmenziel genannt war.
- d) erzeugte **„Keine neuen Maßnahmen, keine neuen Ziele, keine neuen Hilfebedarfsstufen.“** Das ist kein brauchbarer HEB-Maßnahmenabschnitt und enthält Meta-Text.

Bewertung: **v8 ist konzeptionell zu mechanisch und fachlich nicht ausreichend. Die Quellen-Routing-Architektur wird nicht weiterverwendet.**

## Neuer Entwicklungsstand: v9

v9 wechselt auf **Qwen 3 0.6B q4f16 über WebLLM 0.2.82** mit 2048 Tokens Kontext und ersetzt das bisherige regelbasierte Quellen-Routing.

### Geplanter/implementierter Ablauf

1. Originaleingabe wird lokal lediglich in unveränderte Aussagen mit Beleg-IDs zerlegt.
2. Qwen 3 erhält die **gesamte Eingabe** sowie den ausgewählten HEB-Bogen, HEB-Bereich und alle offiziellen Unterpunkte.
3. Der erste Modelllauf verwendet **Thinking-Modus** für eine semantische Gesamtanalyse.
4. Die KI ordnet selbst fachlich zu, welche Tatsachen welche HEB-Unterpunkte tragen, und nennt dafür Beleg-IDs.
5. Ein zweiter lokaler KI-Lauf prüft und überarbeitet den Gesamtentwurf gegen die vollständige Eingabe.
6. Lokale Regeln erzeugen keine HEB-Prosa. Sie blockieren nur strukturell oder fachlich eindeutig unzulässige Ergebnisse.
7. Bekannte reale Fehler aus v8 werden ausdrücklich geblockt, darunter die Negation vorhandenen Unterstützungsbedarfs und metaartige Negativlisten.
8. Fehlen Ziele, Entwicklungen, zukünftige Maßnahmen, Anbieter oder eine formale Hilfebedarfsstufe, wird nichts erfunden.

### Erwartung für den bekannten synthetischen HEB-A-Testfall

- a) soll die Situation **fachlich zusammenführen**, nicht nur die Eingabe Satz für Satz wiederholen; Selbstständigkeit bei Körperpflege und Produktauswahl muss als Ressource erhalten bleiben.
- b) muss Unterstützungsbedarf bei der **Initiierung** der Körperpflege und beim finanziellen Überblick erkennen. Hilfe bei der Durchführung der Körperpflege darf nicht erfunden werden.
- c) muss ohne ausdrücklich genanntes Ziel fehlende Angaben anzeigen.
- d) darf aktuelle Unterstützungen nicht automatisch als zukünftige Maßnahmen ausgeben. Wenn keine Fortführung/Planung genannt ist, muss das transparent erkennbar sein.
- keine Diagnose, Ursache, Bewertung, Entwicklung oder Hilfebedarfsstufe ergänzen.

## Automatisierte Tests

Der GitHub-Pages-Workflow prüft vor dem Deploy:

- JavaScript-Syntax
- bestehende synthetische Quellen-Sicherheitsregressionen
- neue synthetische Reasoning-Parser-/Sicherheitsregressionen
- bekannte v8-Fehler „Keine Selbstversorgung ist notwendig“ und Meta-Negativlisten
- Browser-Smoke-Tests mit Chromium und WebKit
- iPhone-/Android-ähnliche Layouts
- HEB A/B/C und offizielle Hauptbereiche
- Sperre ohne gestartete echte KI
- Dark Mode
- Manifest und Service Worker

## Für v9 noch offen

- GitHub-Actions-Lauf der v9-Änderung muss vollständig grün sein.
- GitHub Pages muss den v9-Stand erfolgreich veröffentlichen.
- Qwen 3 0.6B muss auf dem realen iPhone vollständig laden und ohne Safari-/Speicherabbruch starten.
- der bekannte synthetische HEB-A-Fall muss auf dem realen iPhone fachlich besser ausfallen als v8.
- mehrere aufeinanderfolgende Generierungen auf realem iPhone müssen geprüft werden.
- HEB B muss mit einem synthetischen Verlaufsfall geprüft werden.
- HEB C muss mit einem synthetischen Abschlussfall geprüft werden.
- echter Android-WebGPU-Test steht aus.
- echter Desktop-WebGPU-Test steht aus.

## Freigaberegel

Bis diese Punkte fachlich und technisch ausreichend geprüft sind, keine echten Falldaten verwenden und keine produktive Freigabe behaupten.
