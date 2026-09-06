# HEB-Assist – Teststatus

Stand: 2026-09-06

## Verbindlicher Status

HEB-Assist ist weiterhin ein Test-/Entwicklungsprojekt. Bis zur fachlichen und datenschutzrechtlichen Freigabe dürfen ausschließlich vollständig synthetische Testfälle verwendet werden.

## Aktueller technischer Stand – v13

Der aktuell veröffentlichte Entwicklungsstand verwendet **Qwen 3.5 0.8B Text** über **Transformers.js 4.2.0 / ONNX Runtime WebGPU**.

- Modell: `onnx-community/Qwen3.5-0.8B-Text-ONNX`
- Revision: `1e45daba048899e7f771657ada617ec49350aa91`
- Modelltyp: reines Textmodell; keine Vision-/Bildkomponenten
- Datentyp: `q4f16`, wenn WebGPU `shader-f16` unterstützt; sonst `q4`
- Inferenz: lokal im Browser über WebGPU
- Transformers.js und die benötigten ONNX-Web-Runtime-Dateien werden beim GitHub-Pages-Deploy lokal mit HEB-Assist gebündelt
- Modellressourcen werden beim ersten Start von Hugging Face geladen und anschließend soweit vom Browser unterstützt lokal gecacht
- HEB-Eingaben bleiben gesperrt, bis das echte lokale Sprachmodell vollständig gestartet und einsatzbereit ist
- kein regel-/regexbasierter Ersatz-HEB und kein externer KI-Inferenzserver für Falltexte

Die Generierung erfolgt als zusammenhängende HEB-Synthese über die vollständige Eingabe und die zum gewählten HEB-Bogen gehörenden Unterpunkte. Anschließend prüft eine lokale Sicherheits-/Beleglogik die Ausgabe. Fällt diese Prüfung durch, wird der Text verworfen; die Prüfregeln formulieren keinen Ersatztext.

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

Der erste reale iPhone-Versuch scheiterte zunächst an einem fehlerhaften ONNX-WebGPU-Runtime-Pfad. Nach Korrektur lief der Modelldownload bis 100 %, anschließend erreichte die App aber nicht `KI ist bereit`; der Safari/PWA-Seitenprozess begann funktional erneut.

Bewertung: **Gemma 3 1B / q4f16 wurde auf dem getesteten Ziel-iPhone nicht als stabil einsetzbar bewertet.**

### Qwen 3.5 0.8B – v12

Beim realen iPhone-Test blieb die Startoberfläche bei **94 %** mit `Modelldateien werden lokal vorbereitet ...` stehen. Die App erreichte in diesem Versuch nicht `KI ist bereit`.

Bei der anschließenden Prüfung wurde eine konkrete Architekturabweichung gefunden: v12 verwendete `onnx-community/Qwen3.5-0.8B-ONNX` mit `text-generation`. Dieses Repository ist der multimodale Qwen-3.5-Export und nicht der dedizierte Text-only-Export. Zusätzlich basierte die sichtbare Prozentanzeige teilweise auf Fortschritten einzelner Dateien und konnte deshalb einen scheinbar feststehenden Wert anzeigen, während eine weitere Datei noch bearbeitet wurde.

Bewertung: **v12 wird in dieser Form nicht weitergetestet.** Der beobachtete 94-%-Stand wird nicht als Beweis eines iPhone-OOM interpretiert, weil zuvor die falsche Modellvariante und eine ungenaue Gesamtfortschrittsanzeige korrigiert werden mussten.

### Qwen 3.5 0.8B Text – v13

v13 stellt auf den dedizierten Text-only-ONNX-Export um. Die sichtbare Ladeanzeige verwendet `progress_total` für den Gesamtfortschritt und zeigt, soweit verfügbar, die geladenen und gesamten Datenmengen. Erst nach vollständigem Dateidownload wird der Zustand als Modellinitialisierung bezeichnet.

Der entscheidende reale iPhone-Test von v13 steht noch aus. Qwen 3.5 0.8B Text gilt daher derzeit **weder als iPhone-stabil noch als fachlich geeignet bestätigt**.

## v13 – GitHub/Deployment

### Technische Änderungen

- dediziertes Textmodell `onnx-community/Qwen3.5-0.8B-Text-ONNX`
- feste Revision `1e45daba048899e7f771657ada617ec49350aa91`
- geräteabhängige Quantisierung: `q4f16` bei `shader-f16`, sonst `q4`
- kein Laden von Vision-/Bildmodellteilen
- korrekter Gesamtfortschritt über `progress_total`
- sichtbare Dateigrößenangaben, wenn die Runtime `loaded`/`total` liefert
- bestehender Crash-Loop-Schutz bleibt aktiv
- bestehende Eingabesperre bis `KI ist bereit ✓` bleibt aktiv
- Service-Worker-Cache auf v39 erhöht

### GitHub-Actions-Lauf #125

Der erste v13-Lauf wurde **nicht deployed**, weil vier Browser-Smoke-Tests des Crash-Loop-Schutzes fehlschlugen. Ursache war ein veralteter Test-Fixwert für das v12-Modellprofil. Die App-Logik selbst verglich korrekt gegen das neue v13-Profil. Der Test wurde deshalb aktualisiert; der Schutz wurde nicht abgeschwächt.

Ergebnis dieses Laufes: 24 von 28 Browser-Tests bestanden, Deploy wurde korrekt blockiert.

### GitHub-Actions-Lauf #126 – aktuell veröffentlichter App-Stand

Commit: `a6c623b7551ae973c43480240f1f66aae1fb24c6`

Der Lauf ist vollständig erfolgreich abgeschlossen:

- gebündelte Transformers.js-/ONNX-Web-Runtime vorbereitet
- JavaScript-Syntaxprüfungen bestanden
- v13-Text-only-Architekturprüfung bestanden
- Qwen-3.5-Textsupport der lokalen Runtime geprüft
- gemeinsame `ai-engine.js`-Modulinstanz geprüft
- iOS-Crash-Loop-Schutz mit neuem Modellprofil geprüft
- synthetische Evidence-/Sicherheitsregressionen bestanden
- Chromium und WebKit bestanden
- Android-ähnlicher Chromium-Viewport bestanden
- iPhone-ähnlicher WebKit-Viewport bestanden
- alle **28 von 28 Browser-/Mobile-Smoke-Tests** bestanden
- GitHub-Pages-Artefakt erfolgreich erstellt und hochgeladen
- GitHub Pages erfolgreich deployed

Die Test-Web-App wird unter `https://ys2mm422yb-max.github.io/HEB-Assist/` veröffentlicht.

Diese automatisierten Tests beweisen weiterhin **nicht**, dass Qwen 3.5 0.8B Text auf dem realen Ziel-iPhone vollständig initialisiert oder fachlich ausreichend gute HEB-Texte erzeugt.

## Nächster realer Test

Beim nächsten iPhone-Test soll zunächst ausschließlich geprüft werden:

1. ob die v13-Oberfläche ausdrücklich die Textversion nennt,
2. ob der Gesamtdownload nachvollziehbar fortschreitet statt bei einer Einzeldatei scheinbar zu hängen,
3. ob das Modell nach dem vollständigen Download tatsächlich `KI ist bereit ✓` erreicht,
4. ob der Prozess danach stabil bleibt,
5. ob der Crash-Loop-Schutz bei einem unerwarteten Prozessabbruch einen automatischen weiteren Großdownload verhindert.

Erst wenn der Modellstart bestanden ist, folgt die fachliche Prüfung mit vollständig synthetischen HEB-Fällen.

## Weiterhin offen

- vollständiger v13-Modellstart auf dem realen Ziel-iPhone bis `KI ist bereit ✓`
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
