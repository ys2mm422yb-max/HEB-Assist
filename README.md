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

## Fachliche Grundlage

HEB-Assist orientiert sich an den offiziellen bayerischen HEB-Bögen für Menschen mit einer wesentlichen seelischen Behinderung:

- HEB A – Vorläufige Hilfeplanung
- HEB B – Entwicklungsbericht
- HEB C – Abschlussbericht

Die fünf offiziellen HEB-Bereiche werden unverändert als Hauptbereiche verwendet. Die genaue Struktur steht in `HEB_REFERENCE.md`.

## Technik – v15

- statische HTML/CSS/JavaScript-PWA ohne Backend
- GitHub Pages als Test-Web-App
- lokale Browser-Laufzeit: **WebLLM 0.2.84 / WebGPU**
- Modellkandidat: **Qwen 3.5 0.8B**, `Qwen3.5-0.8B-q4f16_1-MLC`
- reines Textmodell im MLC-Format; keine Bild-/Vision-Modellteile
- Kontextfenster in HEB-Assist auf **3072 Tokens** begrenzt, um den Speicherbedarf auf mobilen Geräten zu reduzieren
- WebLLM-JavaScript-Runtime wird beim GitHub-Actions-Deploy lokal mit der PWA gebündelt
- Modellgewichte und WebGPU-Modellbibliothek werden beim ersten Start geladen und von WebLLM soweit vom Browser unterstützt lokal gecacht
- eigentliche HEB-Inferenz erfolgt nach erfolgreichem Modellstart lokal auf dem Gerät
- Eingabe bleibt bis `KI ist bereit ✓` gesperrt
- kein regel-/regexbasierter Ersatz-HEB
- keine zentrale Datenbank

Qwen 3.5 0.8B bleibt ein **Testkandidat**. Automatisierte Browserprüfungen belegen die App-/Runtime-Integration, aber nicht, dass das Modell auf dem realen Ziel-iPhone stabil initialisiert oder fachlich ausreichend gute HEB-Texte erzeugt.

## Warum v15 statt Transformers.js / ONNX Runtime WebGPU

v13 lud auf dem realen iPhone die richtige Qwen-3.5-Textdatei bis 438 von 448 MB / 98 %, erreichte aber nicht `KI ist bereit`. v14 beseitigte zusätzlich einen bestätigten Transformers.js-4.2.0-Fehler bei Modelldatei-Anforderungen.

Beim anschließenden realen v14-iPhone-Test scheiterte der Start jedoch mit:

`no available backend found. ERR: [webgpu] TypeError: Importing a module script failed.`

Damit lag das Problem nicht mehr am Fortschrittszähler oder allein am Dateidownload, sondern am ONNX-WebGPU-Backend. Die offizielle ONNX-Runtime-Web-Kompatibilitätsmatrix weist WebGPU für Safari auf iOS derzeit als nicht unterstützt aus: https://onnxruntime.ai/docs/get-started/with-javascript/web.html

Der ONNX-WebGPU-Weg wurde deshalb für HEB-Assist beendet. v15 verwendet stattdessen WebLLM. Der frühere reale iPhone-Test mit WebLLM/Qwen 3 0.6B zeigte, dass diese Runtime grundsätzlich auf dem Zielgerät laufen kann; Qwen 3 1.7B war dagegen beim Initialisieren zu schwer. Qwen 3.5 0.8B ist deshalb der nächste bewusst gewählte Geräte-Test, nicht bereits als stabil bestätigt.

## HEB-Synthese und lokale Qualitätsprüfung

1. Das lokale Sprachmodell erhält die vollständige Situation, den gewählten HEB-Bogen, den gewählten offiziellen Bereich und alle dazugehörigen Unterpunkte gemeinsam.
2. Die Eingabe wird in Originalaussagen mit Beleg-IDs zerlegt.
3. Das Sprachmodell formuliert den HEB-Entwurf und darf keine nicht genannten Tatsachen ergänzen.
4. Jeder nicht fehlende Unterpunkt muss Belege aus der Originaleingabe referenzieren.
5. Danach prüft eine lokale Sicherheits-/Beleglogik die Ausgabe.
6. Bei unzureichender oder unzulässiger Ausgabe wird der Text verworfen; die Prüfregeln schreiben keinen Ersatz-HEB.
7. Die Generierung wird gestreamt und bleibt bewusst knapp.

### Fachliche Leitplanken

- Ein verbaler Impuls zum Beginn einer Tätigkeit ist Hilfebedarf bei der **Initiierung**, nicht automatisch bei der Durchführung.
- Vorhandene Selbstständigkeit bleibt als Ressource erhalten.
- Ziele nur bei ausdrücklich genanntem Ziel, Wunsch oder gewünschter Veränderung.
- HEB B/C: Entwicklung nur bei tatsächlich beschriebenem zeitlichen Verlauf.
- Eine formale Hilfebedarfsstufe nur bei ausdrücklicher Angabe.
- Für HEB A darf eine konkret beschriebene laufende Unterstützung als dieselbe geplante Maßnahme benannt werden, wenn ihre Fortführung aus der Eingabe hervorgeht.
- Fehlen Angaben, wird die Lücke kenntlich gemacht statt Inhalt zu erfinden.

## iOS-Startschutz und Cache

Vor einem Modellstart setzt HEB-Assist lokal nur einen technischen Marker aus Modellprofil und Startzeit. Wird ein Start durch einen Safari-/PWA-Prozessabbruch unterbrochen, wird beim nächsten Öffnen kein weiterer Großdownload automatisch gestartet. Ein neuer Versuch muss bewusst ausgelöst werden.

v15 entfernt einmalig alte Startmarker der bisherigen Transformers-/ONNX-Architektur. Danach gilt der Schutz wieder für den neuen WebLLM-Modellstart. Der Marker enthält keinen Falltext und keine HEB-Ausgabe.

WebLLM verwendet für v15 die Browser Cache API. HEB-Assist fordert außerdem best-effort persistenten Website-Speicher an. Browser und iOS entscheiden letztlich über Speicherbereinigung; ein dauerhaft erhaltenes Modell kann daher nicht garantiert werden.

## Automatische Tests / Veröffentlichung

Vor jedem GitHub-Pages-Deploy werden unter anderem geprüft:

- JavaScript-Syntax
- lokaler WebLLM-0.2.84-Build
- Vorhandensein des Qwen-3.5-0.8B-MLC-Modellprofils
- Entfernung der alten Transformers.js-/ONNX-WebGPU-App-Laufzeit
- gemeinsame `ai-engine.js`-Instanz
- Crash-Loop-Schutz
- synthetische Evidence-/Reasoning-/Sicherheitsregressionen
- Chromium und WebKit
- Android-ähnlicher Chromium-Viewport
- iPhone-ähnlicher WebKit-Viewport
- HEB A/B/C und die fünf offiziellen Hauptbereiche
- Eingabesperre ohne gestartete echte KI
- Dark Mode, Manifest, Service Worker und lokale Runtime-Datei

GitHub-Actions-Lauf **#131** für Commit `faeb23c3999254a3dbfbeee9c7006536f6a339c2` ist vollständig erfolgreich abgeschlossen. Alle **28 von 28 Browser-/Mobile-Smoke-Tests** bestanden und GitHub Pages meldete den Deploy für genau diesen Commit erfolgreich.

Diese Tests ersetzen keinen realen WebGPU-Modellstart auf dem Ziel-iPhone und keine fachliche Qualitätsprüfung echter Modellgenerationen mit synthetischen Fällen.

## Aktueller Status

Prototyp / Qualitätstest. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.** Der reale v15-WebLLM-Modellstart mit Qwen 3.5 0.8B auf dem Ziel-iPhone steht noch aus. Bis zur fachlichen Freigabe ausschließlich vollständig synthetische Testfälle verwenden.
