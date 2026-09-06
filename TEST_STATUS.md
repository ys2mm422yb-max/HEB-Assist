# HEB-Assist – Teststatus

Stand: 2026-09-06

## Verbindlicher Status

HEB-Assist ist weiterhin ein Test-/Entwicklungsprojekt. Bis zur fachlichen und datenschutzrechtlichen Freigabe dürfen ausschließlich vollständig synthetische Testfälle verwendet werden.

## Aktueller technischer Stand – v15

Der aktuell veröffentlichte App-Stand verwendet **Qwen 3.5 0.8B** über **WebLLM 0.2.84 / WebGPU**.

- Modell: `Qwen3.5-0.8B-q4f16_1-MLC`
- Modelltyp: reines Textmodell im MLC-Format; keine Vision-/Bildkomponenten
- Kontextfenster in HEB-Assist: 3072 Tokens
- Inferenz: nach vollständigem Start lokal im Browser über WebGPU
- WebLLM-JavaScript-Runtime wird beim GitHub-Pages-Deploy lokal gebündelt
- Modellgewichte und WebGPU-Modellbibliothek werden beim ersten Start geladen und soweit vom Browser unterstützt lokal gecacht
- HEB-Eingaben bleiben gesperrt, bis das echte lokale Sprachmodell vollständig gestartet und einsatzbereit ist
- kein regel-/regexbasierter Ersatz-HEB und kein externer KI-Inferenzserver für Falltexte

Die HEB-Synthese und die bestehende lokale Sicherheits-/Belegprüfung wurden beim Runtime-Wechsel nicht durch einen regelbasierten Generator ersetzt. Fällt die Qualitätsprüfung durch, wird der Text verworfen.

## Reale iPhone-Modelltests – bisherige Erkenntnisse

### Llama 3.2 1B Instruct

Startete vergleichsweise stabil, erzeugte aber mehrfach grammatikalisch und fachlich unbrauchbare HEB-Ausgaben. Für die gewünschte freie HEB-Synthese nicht ausreichend.

### Qwen 3 0.6B / WebLLM

Lief auf dem iPhone grundsätzlich, war fachlich jedoch nicht zuverlässig genug. Die gewünschte semantische HEB-Synthese gelang im damaligen Stand nicht stabil.

Bewertung: **technisch wichtiger Nachweis, dass WebLLM auf dem Ziel-iPhone grundsätzlich starten kann; fachlich damaliges 0.6B-Modell verworfen.**

### Qwen 3 1.7B / WebLLM – v10

Der Modelldownload lief bis 100 %. Direkt beim anschließenden Start/Initialisieren brach der Safari-Webseitenprozess ab. `KI ist bereit` wurde nicht erreicht.

Bewertung: **1.7B war im damaligen WebLLM/PWA-Ansatz auf dem Ziel-iPhone praktisch zu schwer.**

### Gemma 3 1B / ONNX – v11

Nach Korrektur eines Runtime-Pfads lief der Modelldownload bis 100 %, anschließend erreichte die App aber nicht `KI ist bereit`; der Safari/PWA-Seitenprozess startete funktional erneut.

Bewertung: **nicht als stabil einsetzbar bestätigt.**

### Qwen 3.5 0.8B – v12

Der reale iPhone-Test blieb bei einer angezeigten Modellvorbereitung um 94 % stehen. Danach wurde festgestellt, dass v12 den multimodalen statt des dedizierten Text-ONNX-Exports verwendete und die damalige Fortschrittsanzeige nicht belastbar genug war.

Bewertung: **v12 beendet.**

### Qwen 3.5 0.8B Text / Transformers.js – v13

v13 verwendete den dedizierten Text-only-ONNX-Export. Auf dem realen Ziel-iPhone lief `model_q4f16.onnx_data` bis **438 von 448 MB / 98 %** und blieb danach ohne sichtbaren Fortschritt. `KI ist bereit ✓` wurde nicht erreicht.

Danach wurde ein bestätigter Fehler in Transformers.js 4.2.0 identifiziert: Bei aktivem `progress_callback` konnten Modelldateien mehrfach angefordert werden. Dieser bestätigte Fehler wurde in v14 mit dem Upstream-Fix aus `huggingface/transformers.js#1664` beseitigt.

### Qwen 3.5 0.8B Text / Transformers.js – v14

v14 wurde nach 28/28 Browser-/Mobile-Tests erfolgreich veröffentlicht. Beim anschließenden realen iPhone-Test scheiterte der Modellstart jedoch mit:

`no available backend found. ERR: [webgpu] TypeError: Importing a module script failed.`

Damit war der ONNX-WebGPU-Backend-Start selbst als reale Blockade sichtbar. Die offizielle ONNX-Runtime-Web-Kompatibilitätsmatrix weist WebGPU für Safari auf iOS derzeit als nicht unterstützt aus.

Bewertung: **Transformers.js / ONNX Runtime WebGPU wird für HEB-Assist auf iPhone nicht weiterverfolgt.** Der v14-Downloadfix war technisch korrekt, konnte aber das nicht unterstützte Backend nicht lösen.

### Qwen 3.5 0.8B / WebLLM – v15

v15 wechselt die Browser-Runtime auf WebLLM 0.2.84 und verwendet das dort eingebaute `Qwen3.5-0.8B-q4f16_1-MLC`. Das Kontextfenster wird in HEB-Assist auf 3072 Tokens begrenzt, um den mobilen Speicherbedarf gegenüber der Standardkonfiguration zu reduzieren.

Das Modell liegt zwischen dem früher technisch laufenden Qwen-3-0.6B und dem auf dem Ziel-iPhone zu schweren Qwen-3-1.7B. Daraus folgt **keine Garantie**, dass 0.8B stabil startet. Der reale v15-iPhone-Test steht noch aus.

## v15 – GitHub/Deployment

### Technische Änderungen

- Wechsel von Transformers.js / ONNX Runtime WebGPU zu WebLLM 0.2.84
- Modell `Qwen3.5-0.8B-q4f16_1-MLC`
- lokales WebLLM-JavaScript-Bundle `vendor/webllm.js`
- alte Transformers.js-/ONNX-WebGPU-Dateien nicht mehr Teil der App-Laufzeit
- WebLLM Cache API für Modellressourcen
- best-effort Anforderung persistenten Website-Speichers
- Kontextfenster 3072 Tokens
- Generierung über gestreamte WebLLM-Chat-Completions
- bestehende HEB-Evidence-/Reasoning-/Qualitätsprüfung bleibt aktiv
- einmalige Migration alter Transformers-/ONNX-Startmarker
- Crash-Loop-Schutz bleibt für neue v15-Starts aktiv
- Service-Worker-Cache `heb-assist-shell-v41`
- sichtbare App-Build-ID `2026-09-06-v15`

### GitHub-Actions-Lauf #131 – aktuell veröffentlichter App-Stand

App-Commit: `faeb23c3999254a3dbfbeee9c7006536f6a339c2`

Der Lauf ist vollständig erfolgreich abgeschlossen:

- WebLLM 0.2.84 installiert und Browser-Runtime lokal gebündelt
- Qwen-3.5-0.8B-Modellprofil im Bundle verifiziert
- JavaScript-Syntaxprüfungen bestanden
- v15-WebLLM-Architekturprüfung bestanden
- alte Transformers.js-/ONNX-WebGPU-App-Laufzeit ausgeschlossen
- gemeinsame `ai-engine.js`-Modulinstanz geprüft
- Crash-Loop-Schutz nach v15-Migration geprüft
- synthetische Evidence-/Sicherheitsregressionen bestanden
- synthetische Reasoning-/Parserregressionen bestanden
- Chromium und WebKit bestanden
- Android-ähnlicher Chromium-Viewport bestanden
- iPhone-ähnlicher WebKit-Viewport bestanden
- alle **28 von 28 Browser-/Mobile-Smoke-Tests** bestanden
- Pages-Artefakt enthält `vendor/webllm.js`
- GitHub Pages meldete den Deploy für Build-Version `faeb23c3999254a3dbfbeee9c7006536f6a339c2` erfolgreich

Test-Web-App: `https://ys2mm422yb-max.github.io/HEB-Assist/`

Die automatisierten Tests beweisen **nicht**, dass die WebLLM-WebGPU-Modellinitialisierung auf dem realen Ziel-iPhone vollständig funktioniert. Genau das ist der nächste Geräte-Test.

## Nächster realer Test

Beim nächsten iPhone-Test zunächst ausschließlich:

1. die aktuell fehlgeschlagene alte App vollständig schließen,
2. HEB Assist normal neu öffnen; keinen Cache löschen und die PWA nicht neu installieren,
3. prüfen, dass die Startseite **WebLLM** nennt,
4. den v15-Modelldownload im Vordergrund durchlaufen lassen,
5. prüfen, ob das Modell nach vollständigem Download `KI ist bereit ✓` erreicht,
6. bei einem Absturz oder Fehler die sichtbare technische Fehlermeldung dokumentieren,
7. erst nach erfolgreichem Modellstart einen vollständig synthetischen HEB-Test durchführen.

Da WebLLM/MLC ein anderes Modellformat als die bisherige ONNX-Datei verwendet, kann der alte ONNX-Download nicht als fertiger v15-Modellcache wiederverwendet werden. Ein erneuter Modelldownload ist für diesen Architekturwechsel daher erwartbar.

## Weiterhin offen

- vollständiger v15-WebLLM-Modellstart auf dem realen Ziel-iPhone bis `KI ist bereit ✓`
- Stabilität nach erneutem Öffnen der PWA und Nutzung des WebLLM-Modell-Caches
- eine vollständige HEB-Generierung mit einem rein synthetischen Fall
- fachliche Qualität einschließlich Grammatik, HEB-Struktur, Ressourcenorientierung und fehlender Erfindungen
- mehrere aufeinanderfolgende Generierungen auf dem realen iPhone
- echter Offline-Test nach einem zuvor vollständig erfolgreichen Modellstart
- echter Android-WebGPU-Test
- echter Desktop-WebGPU-Test
- mehrere synthetische Qualitätstests für HEB A, B und C

## Freigaberegel

Bis die offenen realen Geräte- und Qualitätstests ausreichend bestanden sind, keine echten Falldaten verwenden und keine produktive Freigabe behaupten.
