# HEB-Assist

HEB-Assist ist eine eigenständige, mobile Web-App/PWA zur Unterstützung bei fachlichen HEB-Formulierungen in der sozialpsychiatrischen Eingliederungshilfe.

## Ziel

Mitarbeitende wählen HEB A, B oder C, den offiziellen HEB-Bereich und beschreiben die Situation in eigenen Worten. HEB-Assist soll daraus einen fachlich nachvollziehbaren, neutralen und ressourcenorientierten Formulierungsvorschlag erzeugen, ohne nicht genannte Tatsachen zu erfinden.

## Verbindliche Grundprinzipien

- **Eigenständiges Projekt:** keine technische, inhaltliche oder datenbezogene Verbindung zu anderen Projekten.
- **Mobile first:** iPhone/iOS ist ein besonders wichtiges Testgerät; Android und Desktop werden ebenfalls berücksichtigt.
- **Lokale KI:** Die eigentliche Textgenerierung erfolgt auf dem Endgerät im Browser; Falltext wird nicht an einen externen KI-Inferenzserver geschickt.
- **Kein versteckter Ersatzmodus:** HEB-Texte werden nur mit vollständig gestarteter echter lokaler KI erzeugt. Regeln dürfen Ergebnisse prüfen und ablehnen, aber keinen vermeintlichen KI-HEB formulieren.
- **Keine erfundenen Tatsachen:** keine frei ergänzten Diagnosen, Symptome, Ursachen, Fähigkeiten, Ressourcen, Entwicklungen, Ziele, Maßnahmen, Hilfebedarfe, Hilfebedarfsstufen oder Anbieter.
- **Fachliche Trennung:** Beobachtung, Selbstaussage und fachliche Einschätzung nicht vermischen.
- **Datensparsamkeit:** keine zentrale Fallhistorie, keine Cloud-Datenbank und kein Login in Version 1.
- **Identifizierende Daten blockieren:** typische direkte Identifikatoren werden lokal geprüft; der Filter ist keine Garantie vollständiger Anonymität.
- **Menschliche Verantwortung:** jeder Entwurf muss vor Übernahme fachlich geprüft werden.
- **Automatische Updates:** veröffentlichte App-Versionen werden automatisch erkannt und übernommen, ohne dass Nutzer normalerweise Cache löschen oder die PWA neu installieren müssen.

## Fachliche Grundlage

HEB-Assist orientiert sich an den offiziellen bayerischen HEB-Bögen für Menschen mit einer wesentlichen seelischen Behinderung:

- HEB A – Vorläufige Hilfeplanung
- HEB B – Entwicklungsbericht
- HEB C – Abschlussbericht

Die fünf offiziellen HEB-Bereiche werden unverändert als Hauptbereiche verwendet. Die genaue Struktur steht in `HEB_REFERENCE.md`.

## Technik – v11

- statische HTML/CSS/JavaScript-PWA ohne Backend
- GitHub Pages als Test-Web-App
- lokale Laufzeit: **Transformers.js 4.2.0 / ONNX Runtime WebGPU**
- lokales Modell: **Gemma 3 1B**, `onnx-community/gemma-3-1b-it-ONNX`
- Modellrevision: `a58439f40017d3b99c7d378ff525e54e0ba08ebf`
- Quantisierung/Datentyp: `q4f16`
- Transformers.js und die benötigten ONNX-Web-Runtime-Dateien werden beim Deploy lokal mit der PWA gebündelt und von GitHub Pages ausgeliefert
- keine externe JavaScript-CDN für die KI-Laufzeit
- Modellressourcen werden beim ersten Start von Hugging Face geladen und anschließend soweit vom Browser unterstützt lokal gecacht
- die eigentliche HEB-Inferenz erfolgt lokal über WebGPU; der Falltext wird nicht als Prompt an einen externen KI-Inferenzdienst gesendet
- Eingabe bleibt bis zum vollständigen Modellstart gesperrt
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank

## v11: zusammenhängende HEB-Synthese mit lokaler Qualitätsprüfung

1. Gemma 3 1B erhält die vollständige Situation, den gewählten HEB-Bogen, den gewählten offiziellen Bereich und alle dazugehörigen Unterpunkte gemeinsam.
2. Die Eingabe wird in Originalaussagen mit Beleg-IDs zerlegt, damit Aussagen der Ausgabe auf tatsächlich vorhandene Inhalte zurückgeführt werden können.
3. Das Sprachmodell formuliert den HEB-Entwurf. Es darf keine nicht genannten Tatsachen ergänzen.
4. Jeder nicht fehlende Unterpunkt muss Belege aus der Originaleingabe referenzieren.
5. Danach prüft eine lokale Sicherheits-/Beleglogik die Ausgabe. Bei einer klar unzulässigen oder nicht ausreichend belegten Ausgabe wird ein Fehler angezeigt und der Text verworfen.
6. Die Prüfregeln schreiben selbst keinen Ersatz-HEB und es gibt keinen regel-/regexbasierten Fallback.
7. Die Generierung wird gestreamt. Die Oberfläche zeigt den aktuellen Bearbeitungszustand, damit ein laufender Prozess von einem Fehler oder Hänger unterscheidbar bleibt.
8. HEB-Texte bleiben bewusst knapp, damit sie näher an die begrenzten Textfelder der offiziellen Bögen passen.

### Fachliche Leitplanken

- Ein verbaler Impuls zum Beginn einer Tätigkeit ist Hilfebedarf bei der **Initiierung**, nicht automatisch bei der Durchführung.
- Vorhandene Selbstständigkeit bleibt als Ressource erhalten.
- Ziele nur bei ausdrücklich genanntem Ziel, Wunsch oder gewünschter Veränderung.
- HEB B/C: Entwicklung nur bei tatsächlich beschriebenem zeitlichem Verlauf.
- Eine formale Hilfebedarfsstufe wird nur ausgegeben, wenn sie in der Eingabe ausdrücklich genannt ist.
- Für HEB A darf eine konkret beschriebene laufende Unterstützung als dieselbe geplante Maßnahme benannt werden, wenn aus der Eingabe ihre Fortführung hervorgeht; zusätzliche oder intensivere Maßnahmen dürfen nicht ergänzt werden.
- Fehlen ausreichende Angaben für einen offiziellen Unterpunkt, wird die Lücke kenntlich gemacht statt Inhalt zu erfinden.

## Lokale Runtime und Modell-Cache

Die JavaScript-KI-Laufzeit wird aus dem npm-Paket `@huggingface/transformers` beim GitHub-Actions-Deploy lokal gebündelt. Zusätzlich werden die für ONNX Runtime Web benötigten Runtime-Dateien mit der PWA ausgeliefert und über den Service Worker gecacht.

Die Modellressourcen selbst werden beim ersten Modellstart von Hugging Face geladen. Transformers.js nutzt den Browser-Cache, soweit dieser vom Browser unterstützt und nicht vom Betriebssystem bereinigt wird. Ein erneuter vollständiger Download soll dadurch nach Möglichkeit vermieden werden, kann technisch aber nicht garantiert ausgeschlossen werden.

Nach einem vollständig erfolgreichen Modellstart erfolgt die eigentliche Textgenerierung lokal auf dem Endgerät. Echter Offlinebetrieb muss auf den Zielgeräten separat geprüft werden und hängt davon ab, dass die benötigten App- und Modellressourcen lokal erhalten geblieben sind.

## Automatische Tests

Vor jedem GitHub-Pages-Deploy werden unter anderem ausgeführt:

- JavaScript-Syntaxprüfungen
- Build der lokal gebündelten Transformers.js-/ONNX-Web-Runtime
- v11-Architekturprüfung
- synthetische Quellen-/Sicherheits-Regressionstests
- Reasoning-Ausgabeparser-/Sicherheitstests
- Browser-Smoke-Tests in Chromium und WebKit
- Android-ähnlicher Chromium-Viewport
- iPhone-ähnlicher WebKit-Viewport
- HEB A/B/C und die fünf offiziellen Hauptbereiche
- Eingabesperre ohne gestartete echte KI
- Dark Mode und mobile Viewport-Prüfungen
- Manifest, Service Worker und lokal ausgelieferte Runtime-Dateien

Ein fehlgeschlagener relevanter Test verhindert den Deploy. Diese Tests ersetzen keine echte WebGPU-Inferenz auf einem realen iPhone, Android-Gerät oder Desktop und keine fachliche Qualitätsprüfung echter Modellgenerationen mit synthetischen Fällen.

## Externe Netzwerkzugriffe

Beim normalen Online-Betrieb werden statische App-Dateien von GitHub Pages geladen. Beim ersten Modellstart bzw. falls der lokale Browser-Cache nicht mehr vorhanden ist, werden Modellressourcen von Hugging Face geladen. Diese Downloads enthalten keinen HEB-Falltext als KI-Inferenzanfrage.

Bei den beteiligten Infrastrukturbetreibern können technisch übliche Verbindungsmetadaten wie IP-Adresse, Browserinformationen und Zeitstempel anfallen. Die eigentliche HEB-Generierung erfolgt nach dem Modellstart lokal im Browser.

## Entwicklungsworkflow

Solange HEB-Assist ausdrücklich Test-/Entwicklungsprojekt ist, darf direkt auf `main` gearbeitet werden. GitHub ist die verbindliche technische Quelle. Änderungen gelten erst als veröffentlicht, wenn der zugehörige GitHub-Actions-Lauf erfolgreich war und GitHub Pages tatsächlich deployed wurde. Der reale Prüfstand steht in `TEST_STATUS.md`.

## Aktueller Status

Prototyp / Qualitätstest. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.** Bis zur fachlichen Freigabe ausschließlich vollständig synthetische Testfälle verwenden.
