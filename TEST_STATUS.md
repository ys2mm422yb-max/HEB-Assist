# HEB-Assist – Teststatus

Stand: 2026-09-06

## Verbindlicher Status

HEB-Assist ist weiterhin ein Test-/Entwicklungsprojekt. Bis zur fachlichen und datenschutzrechtlichen Freigabe dürfen ausschließlich vollständig synthetische Testfälle verwendet werden.

## Aktueller technischer Stand – v12

Der aktuell veröffentlichte Entwicklungsstand verwendet **Qwen 3.5 0.8B** über **Transformers.js 4.2.0 / ONNX Runtime WebGPU**.

- Modell: `onnx-community/Qwen3.5-0.8B-ONNX`
- Revision: `7126260ed8e5acbe7b5d0b84bbec84df50b63a87`
- Datentyp: `q4f16`
- für HEB-Assist angeforderte Modellteile: `embed_tokens` und `decoder_model_merged`
- Inferenz: lokal im Browser über WebGPU
- Transformers.js und die benötigten ONNX-Web-Runtime-Dateien werden beim GitHub-Pages-Deploy lokal mit HEB-Assist gebündelt
- die Modellressourcen werden beim ersten Start von Hugging Face geladen und anschließend soweit vom Browser unterstützt lokal gecacht
- HEB-Eingaben bleiben gesperrt, bis das echte lokale Sprachmodell vollständig gestartet und einsatzbereit ist
- es gibt keinen regel-/regexbasierten Ersatz-HEB und keinen externen KI-Inferenzserver für Falltexte

Die Generierung erfolgt weiterhin als zusammenhängende HEB-Synthese über die vollständige Eingabe und die zum gewählten HEB-Bogen gehörenden Unterpunkte. Anschließend prüft eine lokale Sicherheits-/Beleglogik die Ausgabe. Fällt diese Prüfung durch, wird der Text verworfen und ein Fehler angezeigt; die Prüfregeln formulieren keinen Ersatztext.

## v12 – GitHub/Deployment

### Commit `84ee5b327ee0ee56a455cb3635e38f7b0a9ddd7d`

Dieser Commit stellte HEB-Assist von Gemma 3 1B auf Qwen 3.5 0.8B um und ergänzte einen iOS-Crash-Loop-Schutz.

Der Schutz setzt vor einem Modellstart lokal einen technischen Marker aus Modellprofil und Startzeit. Wird der Safari-/PWA-Prozess während eines nicht abgeschlossenen Starts beendet und die App neu geladen, darf nicht automatisch erneut ein großer Modelldownload beginnen. Stattdessen zeigt HEB-Assist `Automatischer KI-Neustart gestoppt` bzw. `Erneuter Download gestoppt`. Ein neuer Versuch muss dann bewusst über `KI erneut starten` ausgelöst werden.

GitHub-Actions-Lauf **#119** war vollständig erfolgreich und bestand **28 von 28 Browser-/Mobile-Smoke-Tests**. Der Stand wurde erfolgreich auf GitHub Pages veröffentlicht.

### Nachträglich gefundener Modulinstanz-Fehler

Bei der anschließenden Codekontrolle vor dem realen iPhone-Test wurde ein Fehler im v12-Startpfad gefunden: `bootstrap.js` lud `ai-engine.js` zunächst mit einer Build-Query-URL, während `app.js` dieselbe Datei ohne Query importierte. Browser behandeln diese beiden URLs als getrennte ES-Module. Dadurch hätten zwei getrennte KI-Zustände entstehen können.

Dieser Fehler wurde gefunden, bevor der Nutzer den v12-Kandidaten real testen sollte.

### Commit `781d095b88afece37c01fee9f252d2659b0d3649` – aktuell veröffentlichter App-Stand

Der Fix stellt sicher, dass Bootstrap und App exakt dieselbe `./ai-engine.js`-Modulinstanz verwenden. Die CI enthält jetzt zusätzlich eine Sperre gegen unterschiedliche `ai-engine.js`-Import-URLs.

GitHub-Actions-Lauf **#120** ist vollständig erfolgreich abgeschlossen:

- offizielle gebündelte Transformers.js-Browser-Runtime vorbereitet
- JavaScript-Syntaxprüfungen bestanden
- v12-Architekturprüfung bestanden
- Qwen-3.5-Textsupport der lokalen Runtime geprüft
- gemeinsame `ai-engine.js`-Modulinstanz geprüft
- iOS-Crash-Loop-Schutz geprüft
- synthetische Evidence-/Sicherheitsregressionen bestanden
- Chromium und WebKit bestanden
- Android-ähnlicher Chromium-Viewport bestanden
- iPhone-ähnlicher WebKit-Viewport bestanden
- **28 von 28 Browser-/Mobile-Smoke-Tests bestanden**
- GitHub-Pages-Artefakt erfolgreich erstellt und hochgeladen
- Pages-Deployment für exakt Commit `781d095b88afece37c01fee9f252d2659b0d3649` erstellt
- GitHub Pages meldete anschließend ausdrücklich `success`

Die Test-Web-App wird unter `https://ys2mm422yb-max.github.io/HEB-Assist/` veröffentlicht.

Diese automatisierten Tests beweisen weiterhin **nicht**, dass Qwen 3.5 0.8B auf dem realen Ziel-iPhone vollständig initialisiert oder fachlich ausreichend gute HEB-Texte erzeugt.

Reine spätere Markdown-Dokumentationsänderungen lösen keinen Pages-Deploy aus und verändern den veröffentlichten App-Code nicht.

## Reale iPhone-Modelltests – bisherige Erkenntnisse

### Llama 3.2 1B Instruct

Startete vergleichsweise stabil, erzeugte aber mehrfach grammatikalisch und fachlich unbrauchbare HEB-Ausgaben. Für die gewünschte freie HEB-Synthese nicht ausreichend.

### Qwen 3 0.6B

Lief auf dem iPhone grundsätzlich, war fachlich jedoch nicht zuverlässig genug. Die gewünschte semantische HEB-Synthese gelang im damaligen Stand nicht stabil.

Bewertung: **Qwen 3 0.6B wurde im damaligen Generierungsansatz für die eigentliche HEB-Generierung verworfen.**

### Qwen 3 1.7B – v10

Der Modelldownload lief auf dem realen iPhone bis 100 %. Direkt beim anschließenden Start/Initialisieren brach der Safari-Webseitenprozess ab. Die App erreichte nicht den Zustand `KI ist bereit`.

Bewertung: **Qwen 3 1.7B im damaligen WebLLM/PWA-Ansatz ist auf dem getesteten iPhone nicht praktisch einsetzbar.** Dieser Weg wurde beendet.

### Gemma 3 1B – v11

Der erste reale iPhone-Versuch mit v11 scheiterte noch vor dem Modelldownload am Browser-Modulimport mit `onnxruntime-web/webgpu does not resolve to a valid URL`. Dieser konkrete Runtime-Buildfehler wurde später korrigiert.

Beim anschließenden realen iPhone-Retest mit dem korrigierten Build wurde der Modelldownload bis 100 % abgeschlossen. Unmittelbar beim anschließenden Initialisieren erreichte die App jedoch nicht `KI ist bereit`; stattdessen startete der Ladeablauf ohne Nutzereingriff erneut von vorn.

Der damalige App-Code enthielt innerhalb eines Seitenlaufs keinen automatischen Modell-Neustart nach 100 %. `generatorPromise` verhinderte parallele bzw. doppelte Pipeline-Initialisierungen. Das beobachtete Zurückspringen auf einen frischen Ladeablauf war daher mit einem Neustart des Safari/PWA-Seitenprozesses vereinbar und entsprach funktional einem fehlgeschlagenen realen Modellstart.

Bewertung: **Gemma 3 1B / q4f16 wird auf dem getesteten Ziel-iPhone nicht als stabil einsetzbar bewertet. Weitere wiederholte Downloads dieses Kandidaten sind nicht sinnvoll.**

### Qwen 3.5 0.8B – v12

Der aktuelle Kandidat ist kleiner als Gemma 3 1B und wird in HEB-Assist nur über den Textpfad geladen. Die Runtime-/Architekturprüfungen sind grün. Der entscheidende reale iPhone-Test des aktuellen veröffentlichten Commits `781d095b...` steht noch aus.

Qwen 3.5 0.8B gilt deshalb derzeit **weder als iPhone-stabil noch als fachlich geeignet bestätigt**.

## Nächster realer Test

Beim nächsten iPhone-Test soll zunächst ausschließlich geprüft werden:

1. startet der Modelldownload bzw. die Vorbereitung korrekt,
2. erreicht das Modell nach dem Download tatsächlich `KI ist bereit ✓`,
3. bleibt der Prozess danach stabil,
4. verhindert der Crash-Loop-Schutz bei einem erneuten Prozessabbruch einen automatischen weiteren Großdownload.

Erst wenn der Modellstart bestanden ist, folgt die fachliche Prüfung mit vollständig synthetischen HEB-Fällen.

## Weiterhin offen

- vollständiger Qwen-3.5-Modellstart auf dem realen Ziel-iPhone bis `KI ist bereit ✓`
- eine vollständige HEB-Generierung mit einem rein synthetischen Fall
- fachliche Qualität einschließlich Grammatik, HEB-Struktur, Ressourcenorientierung und fehlender Erfindungen
- mehrere aufeinanderfolgende Generierungen auf dem realen iPhone
- Verhalten nach erneutem Öffnen der PWA und Nutzung des lokalen Modell-Caches
- echter Offline-Test nach einem zuvor vollständig erfolgreichen Modellstart
- echter Android-WebGPU-Test
- echter Desktop-WebGPU-Test
- mehrere synthetische Qualitätstests für HEB A, B und C

## Freigaberegel

Bis die offenen realen Geräte- und Qualitätstests ausreichend bestanden sind, keine echten Falldaten verwenden und keine produktive Freigabe behaupten.
