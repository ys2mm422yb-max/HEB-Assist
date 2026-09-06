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

## Technik – v14

- statische HTML/CSS/JavaScript-PWA ohne Backend
- GitHub Pages als Test-Web-App
- lokale Laufzeit: **Transformers.js 4.2.0 / ONNX Runtime WebGPU**
- lokal gebündelte Transformers.js-4.2.0-Runtime enthält den bestätigten Upstream-Fix aus [huggingface/transformers.js#1664](https://github.com/huggingface/transformers.js/pull/1664) gegen mehrfache Modelldatei-Anforderungen bei aktivem `progress_callback`
- lokaler Modellkandidat: **Qwen 3.5 0.8B Text**, `onnx-community/Qwen3.5-0.8B-Text-ONNX`
- gepinnte Modellrevision: `1e45daba048899e7f771657ada617ec49350aa91`
- ausschließlich Textmodell; keine Vision-/Bildmodellteile
- Quantisierung wird geräteabhängig gewählt: `q4f16`, wenn WebGPU `shader-f16` unterstützt, sonst `q4`
- Transformers.js und die benötigten ONNX-Web-Runtime-Dateien werden beim Deploy lokal mit der PWA gebündelt
- keine externe JavaScript-CDN für die KI-Laufzeit
- Modellressourcen werden beim ersten Start von Hugging Face geladen und anschließend soweit vom Browser unterstützt lokal gecacht
- die eigentliche HEB-Inferenz erfolgt lokal über WebGPU; der Falltext wird nicht als Prompt an einen externen KI-Inferenzdienst gesendet
- Eingabe bleibt bis zum vollständigen Modellstart gesperrt
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank

Qwen 3.5 0.8B Text ist weiterhin **Testkandidat**. Automatisierte Browserprüfungen belegen die Runtime-/App-Architektur, aber noch nicht, dass das Modell auf dem realen Ziel-iPhone vollständig initialisiert oder fachlich ausreichend gute HEB-Texte erzeugt.

## Warum v13 statt v12

Der reale iPhone-Test von v12 blieb bei einer angezeigten Modellvorbereitung um 94 % stehen. Bei der anschließenden technischen Prüfung wurden zwei konkrete Probleme des v12-Wegs gefunden:

1. v12 verwendete `onnx-community/Qwen3.5-0.8B-ONNX` mit einer `text-generation`-Pipeline. Dieses Repository ist ein multimodaler Qwen-3.5-Export und nicht der dedizierte Text-only-Export.
2. Die Ladeanzeige basierte teilweise auf Fortschritten einzelner Dateien. Dadurch konnte die Oberfläche beispielsweise 94 % anzeigen, obwohl im Hintergrund eine weitere Modelldatei geladen oder vorbereitet wurde.

v13 nutzt deshalb den dedizierten Text-only-ONNX-Export und wertet für den sichtbaren Gesamtfortschritt `progress_total` aus. Wenn Größeninformationen verfügbar sind, zeigt die Oberfläche zusätzlich geladene und gesamte MB an. Erst nach vollständigem Dateidownload wechselt die Anzeige ausdrücklich zur Initialisierung der KI.

## Warum v14 statt v13

Beim realen v13-iPhone-Test lief der Download der tatsächlichen `q4f16`-Modelldatei zunächst bis 423 von 448 MB und anschließend bis 438 von 448 MB. Bei 98 % war danach kein weiterer sichtbarer Fortschritt mehr erkennbar. Dieser einzelne Geräteversuch beweist für sich allein noch nicht die genaue Ursache.

Bei der anschließenden Runtime-Prüfung wurde jedoch ein bestätigter Fehler in exakt der verwendeten Abhängigkeit **Transformers.js 4.2.0** gefunden: Bei aktivem `progress_callback` können Modelldateien mehrfach angefordert werden. Das Problem ist als [Issue #1663](https://github.com/huggingface/transformers.js/issues/1663) dokumentiert und wurde upstream mit [PR #1664](https://github.com/huggingface/transformers.js/pull/1664) behoben.

Da HEB-Assist für die Fortschrittsanzeige genau diesen Callback benötigt und die verwendete npm-Version weiterhin 4.2.0 ist, übernimmt der v14-Build exakt die upstream korrigierte Normalisierung des Memoize-Schlüssels in die lokal gebündelte Browser-Runtime. Der Build bricht ab, wenn die erwartete fehlerhafte Stelle nicht eindeutig gefunden oder der Fix nicht nachweisbar eingebaut wurde.

Das Qwen-Textmodell, die Quantisierung, die HEB-Generierungslogik und die Datenschutzlogik wurden für v14 nicht gewechselt.

## HEB-Synthese und lokale Qualitätsprüfung

1. Das lokale Sprachmodell erhält die vollständige Situation, den gewählten HEB-Bogen, den gewählten offiziellen Bereich und alle dazugehörigen Unterpunkte gemeinsam.
2. Die Eingabe wird in Originalaussagen mit Beleg-IDs zerlegt, damit Aussagen der Ausgabe auf tatsächlich vorhandene Inhalte zurückgeführt werden können.
3. Das Sprachmodell formuliert den HEB-Entwurf. Es darf keine nicht genannten Tatsachen ergänzen.
4. Jeder nicht fehlende Unterpunkt muss Belege aus der Originaleingabe referenzieren.
5. Danach prüft eine lokale Sicherheits-/Beleglogik die Ausgabe. Bei einer klar unzulässigen oder nicht ausreichend belegten Ausgabe wird ein Fehler angezeigt und der Text verworfen.
6. Die Prüfregeln schreiben selbst keinen Ersatz-HEB und es gibt keinen regel-/regexbasierten Fallback.
7. Die Generierung wird gestreamt. Die Oberfläche zeigt den aktuellen Bearbeitungszustand.
8. HEB-Texte bleiben bewusst knapp, damit sie näher an die begrenzten Textfelder der offiziellen Bögen passen.

### Fachliche Leitplanken

- Ein verbaler Impuls zum Beginn einer Tätigkeit ist Hilfebedarf bei der **Initiierung**, nicht automatisch bei der Durchführung.
- Vorhandene Selbstständigkeit bleibt als Ressource erhalten.
- Ziele nur bei ausdrücklich genanntem Ziel, Wunsch oder gewünschter Veränderung.
- HEB B/C: Entwicklung nur bei tatsächlich beschriebenem zeitlichen Verlauf.
- Eine formale Hilfebedarfsstufe wird nur ausgegeben, wenn sie in der Eingabe ausdrücklich genannt ist.
- Für HEB A darf eine konkret beschriebene laufende Unterstützung als dieselbe geplante Maßnahme benannt werden, wenn aus der Eingabe ihre Fortführung hervorgeht; zusätzliche oder intensivere Maßnahmen dürfen nicht ergänzt werden.
- Fehlen ausreichende Angaben für einen offiziellen Unterpunkt, wird die Lücke kenntlich gemacht statt Inhalt zu erfinden.

## iOS-Startschutz

HEB-Assist enthält einen Schutz gegen automatische Großdownload-Schleifen nach einem unerwarteten Safari-/PWA-Prozessabbruch während der Modellinitialisierung. Vor einem Modellstart wird lokal nur ein technischer Marker aus Modellprofil und Startzeit gesetzt. Wird die Seite während eines noch nicht abgeschlossenen Starts neu geladen, startet HEB-Assist den Modelldownload nicht automatisch erneut, sondern stoppt und verlangt einen bewussten manuellen Neustart.

v14 entfernt einmalig einen zurückgebliebenen v13-Startmarker, damit ein bereits festgefahrener v13-Versuch den ersten v14-Start nicht blockiert. Danach bleibt der Crash-Loop-Schutz unverändert aktiv: Ein neuer unvollständiger v14-Start wird beim nächsten Öffnen wieder erkannt und ein automatischer zweiter Großdownload wird gestoppt.

Dieser Marker enthält keinen Falltext und keine HEB-Ausgabe. Nach einem erfolgreichen Modellstart oder einem regulär abgefangenen technischen Fehler wird er wieder entfernt.

Die CI prüft außerdem, dass `ai-engine.js` nur unter einer einheitlichen Modul-URL geladen wird. Dadurch teilen Bootstrap und App dieselbe KI-Instanz und denselben Ladezustand.

## Lokale Runtime und Modell-Cache

Die JavaScript-KI-Laufzeit wird aus dem npm-Paket `@huggingface/transformers` beim GitHub-Actions-Deploy lokal gebündelt. Im v14-Build wird zusätzlich der bestätigte Upstream-Fix aus Transformers.js PR #1664 auf die 4.2.0-Browser-Runtime angewendet und technisch verifiziert. Zusätzlich werden die für ONNX Runtime Web benötigten Runtime-Dateien mit der PWA ausgeliefert und über den Service Worker gecacht.

Die Modellressourcen selbst werden beim ersten Modellstart von Hugging Face geladen. Transformers.js nutzt den Browser-Cache, soweit dieser vom Browser unterstützt und nicht vom Betriebssystem bereinigt wird. Ein erneuter vollständiger Download soll dadurch nach Möglichkeit vermieden werden, kann technisch aber nicht garantiert ausgeschlossen werden.

Nach einem vollständig erfolgreichen Modellstart erfolgt die eigentliche Textgenerierung lokal auf dem Endgerät. Echter Offlinebetrieb muss auf den Zielgeräten separat geprüft werden und hängt davon ab, dass die benötigten App- und Modellressourcen lokal erhalten geblieben sind.

## Automatische Tests

Vor jedem GitHub-Pages-Deploy werden unter anderem ausgeführt:

- JavaScript-Syntaxprüfungen
- Build der lokal gebündelten Transformers.js-/ONNX-Web-Runtime
- harte Prüfung, dass der v14-Runtime-Fix für Transformers.js #1664 eindeutig angewendet wurde
- Architekturprüfung für den dedizierten Qwen-3.5-Text-Export
- Prüfung des Qwen-3.5-Textsupport-Exports der Runtime
- Prüfung auf eine gemeinsame `ai-engine.js`-Modulinstanz
- Prüfung des iOS-Crash-Loop-Schutzes nach der v14-Guard-Migration
- synthetische Quellen-/Sicherheits-Regressionstests
- Reasoning-Ausgabeparser-/Sicherheitstests
- Browser-Smoke-Tests in Chromium und WebKit
- Android-ähnlicher Chromium-Viewport
- iPhone-ähnlicher WebKit-Viewport
- HEB A/B/C und die fünf offiziellen Hauptbereiche
- Eingabesperre ohne gestartete echte KI
- Dark Mode und mobile Viewport-Prüfungen
- Manifest, Service Worker und lokal ausgelieferte Runtime-Dateien

GitHub-Actions-Lauf **#130** für Commit `921682b868044b9be181c46b4c456d5788b75983` ist vollständig erfolgreich abgeschlossen. Die gepatchte Runtime wurde gebaut, alle **28 von 28 Browser-/Mobile-Smoke-Tests** bestanden, das Pages-Artefakt wurde hochgeladen und GitHub Pages meldete den Deploy für genau diesen Commit als erfolgreich.

Ein fehlgeschlagener relevanter Test verhindert den Deploy. Diese Tests ersetzen keine echte WebGPU-Inferenz auf einem realen iPhone, Android-Gerät oder Desktop und keine fachliche Qualitätsprüfung echter Modellgenerationen mit synthetischen Fällen.

## Externe Netzwerkzugriffe

Beim normalen Online-Betrieb werden statische App-Dateien von GitHub Pages geladen. Beim ersten Modellstart bzw. falls der lokale Browser-Cache nicht mehr vorhanden ist, werden Modellressourcen von Hugging Face geladen. Diese Downloads enthalten keinen HEB-Falltext als KI-Inferenzanfrage.

Bei den beteiligten Infrastrukturbetreibern können technisch übliche Verbindungsmetadaten wie IP-Adresse, Browserinformationen und Zeitstempel anfallen. Die eigentliche HEB-Generierung erfolgt nach dem Modellstart lokal im Browser.

## Entwicklungsworkflow

Solange HEB-Assist ausdrücklich Test-/Entwicklungsprojekt ist, darf direkt auf `main` gearbeitet werden. GitHub ist die verbindliche technische Quelle. Änderungen gelten erst als veröffentlicht, wenn der zugehörige GitHub-Actions-Lauf erfolgreich war und GitHub Pages tatsächlich deployed wurde. Der reale Prüfstand steht in `TEST_STATUS.md`.

## Aktueller Status

Prototyp / Qualitätstest. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.** Der reale v14-Modellstart auf dem Ziel-iPhone steht noch aus. Bis zur fachlichen Freigabe ausschließlich vollständig synthetische Testfälle verwenden.
