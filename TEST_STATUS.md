# HEB-Assist – Teststatus

Stand: 2026-09-06

## Verbindlicher Status

HEB-Assist ist weiterhin ein Test-/Entwicklungsprojekt. Bis zur fachlichen und datenschutzrechtlichen Freigabe dürfen ausschließlich vollständig synthetische Testfälle verwendet werden.

## Aktueller technischer Stand – v11

Der aktuelle Entwicklungsstand verwendet **Gemma 3 1B** über **Transformers.js 4.2.0 / ONNX Runtime WebGPU**.

- Modell: `onnx-community/gemma-3-1b-it-ONNX`
- Revision: `a58439f40017d3b99c7d378ff525e54e0ba08ebf`
- Datentyp: `q4f16`
- Inferenz: lokal im Browser über WebGPU
- Transformers.js und die benötigten ONNX-Web-Runtime-Dateien werden beim GitHub-Pages-Deploy lokal mit HEB-Assist gebündelt.
- Die Modellressourcen werden beim ersten Start von Hugging Face geladen und anschließend soweit vom Browser unterstützt lokal gecacht.
- HEB-Eingaben bleiben gesperrt, bis das echte lokale Sprachmodell vollständig gestartet und einsatzbereit ist.
- Es gibt keinen regel-/regexbasierten Ersatz-HEB und keinen externen KI-Inferenzserver für Falltexte.

Die Generierung erfolgt als zusammenhängende HEB-Synthese über die vollständige Eingabe und die zum gewählten HEB-Bogen gehörenden Unterpunkte. Anschließend prüft eine lokale Sicherheits-/Beleglogik die Ausgabe. Fällt diese Prüfung durch, wird der Text verworfen und ein Fehler angezeigt; die Prüfregeln formulieren keinen Ersatztext.

## v11 – GitHub/Deployment

Der erste v11-Lauf war wegen eines falschen Pfades zu ONNX-WebGPU-Runtime-Dateien fehlgeschlagen. Der Pfad wurde anschließend korrigiert.

Aktueller veröffentlichter App-Commit vor dieser Dokumentationsaktualisierung:

- `610283efb2a7a54190854d81b0c7ff76dbba752f` – `Fix ONNX WebGPU runtime asset paths`

GitHub-Actions-Lauf **#116** für diesen Commit ist vollständig erfolgreich abgeschlossen. Im Lauf wurden unter anderem bestanden:

- Build der lokal gebündelten Transformers.js-/ONNX-Web-Runtime
- JavaScript-Syntaxprüfungen
- v11-Architekturprüfung
- synthetische Evidence-/Sicherheitsregressionen
- Chromium- und WebKit-Smoke-Tests
- iPhone-/Android-ähnliche Viewports
- insgesamt 20 Browser-Smoke-Tests
- Erstellung und Upload des GitHub-Pages-Artefakts
- GitHub-Pages-Deployment für exakt Commit `610283efb2a7a54190854d81b0c7ff76dbba752f`

Der Pages-Deployment-Schritt meldete erfolgreich `success`. Die Test-Web-App wird unter `https://ys2mm422yb-max.github.io/HEB-Assist/` veröffentlicht.

Am 2026-09-06 wurden `README.md`, `TEST_STATUS.md`, `PRIVACY_POLICY.md` und `HEB_REFERENCE.md` auf den tatsächlichen v11-Stand synchronisiert. Diese Dokumentationskorrektur ändert keine App- oder KI-Logik.

Diese automatisierten Tests beweisen **nicht**, dass die echte Gemma-3-WebGPU-Inferenz auf einem realen iPhone stabil startet oder fachlich ausreichend gute HEB-Texte erzeugt.

## Reale iPhone-Modelltests – bisherige Erkenntnisse

### Llama 3.2 1B Instruct

Startete vergleichsweise stabil, erzeugte aber mehrfach grammatikalisch und fachlich unbrauchbare HEB-Ausgaben. Für die gewünschte freie HEB-Synthese nicht ausreichend.

### Qwen 3 0.6B

Lief auf dem iPhone grundsätzlich, war fachlich jedoch nicht zuverlässig genug. Die gewünschte semantische HEB-Synthese gelang nicht stabil.

Bewertung: **Qwen 3 0.6B wird für die eigentliche HEB-Generierung nicht weiterverwendet.**

### Qwen 3 1.7B – v10

Der Modelldownload lief auf dem realen iPhone bis 100 %. Direkt beim anschließenden Start/Initialisieren brach der Safari-Webseitenprozess ab. Die App erreichte nicht den Zustand „KI ist bereit“.

Bewertung: **Qwen 3 1.7B im damaligen WebLLM/PWA-Ansatz ist auf dem getesteten iPhone nicht praktisch einsetzbar.** Dieser Weg wurde beendet.

## Noch nicht geprüft – v11

Für Gemma 3 1B / Transformers.js v11 fehlt aktuell noch der entscheidende reale Gerätetest. Noch offen sind insbesondere:

- vollständiger Modellstart auf dem realen Ziel-iPhone bis „KI ist bereit“
- eine vollständige HEB-Generierung mit einem rein synthetischen Fall
- fachliche Qualität des Ergebnisses einschließlich Grammatik, HEB-Struktur, Ressourcenorientierung und fehlender Erfindungen
- mehrere aufeinanderfolgende Generierungen auf dem realen iPhone
- Verhalten nach erneutem Öffnen der PWA und Nutzung des lokalen Modell-Caches
- echter Offline-Test nach einem zuvor vollständig erfolgreichen Modellstart
- echter Android-WebGPU-Test
- echter Desktop-WebGPU-Test
- mehrere synthetische Qualitätstests für HEB A, B und C

Gemma 3 1B ist deshalb aktuell ein **zu prüfender v11-Kandidat**, nicht bereits als iPhone-stabil oder fachlich freigegeben bestätigt.

## Freigaberegel

Bis die offenen realen Geräte- und Qualitätstests ausreichend bestanden sind, keine echten Falldaten verwenden und keine produktive Freigabe behaupten.
