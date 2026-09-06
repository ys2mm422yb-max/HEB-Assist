# HEB-Assist – Teststatus

Stand: 2026-09-06

## Verbindlicher Status

HEB-Assist ist weiterhin ein Test-/Entwicklungsprojekt. Bis zur fachlichen und datenschutzrechtlichen Freigabe dürfen ausschließlich vollständig synthetische Testfälle verwendet werden.

## Aktueller technischer Stand – v14

Der aktuell veröffentlichte Entwicklungsstand verwendet **Qwen 3.5 0.8B Text** über **Transformers.js 4.2.0 / ONNX Runtime WebGPU**. Die lokal gebündelte Transformers.js-4.2.0-Runtime enthält zusätzlich den bestätigten Upstream-Fix aus `huggingface/transformers.js#1664` gegen mehrfache Modelldatei-Anforderungen bei aktivem `progress_callback`.

- Modell: `onnx-community/Qwen3.5-0.8B-Text-ONNX`
- Revision: `1e45daba048899e7f771657ada617ec49350aa91`
- Modelltyp: reines Textmodell; keine Vision-/Bildkomponenten
- Datentyp: `q4f16`, wenn WebGPU `shader-f16` unterstützt; sonst `q4`
- Inferenz: lokal im Browser über WebGPU
- Transformers.js und die benötigten ONNX-Web-Runtime-Dateien werden beim GitHub-Pages-Deploy lokal mit HEB-Assist gebündelt
- der Build wendet den Upstream-Fix aus PR #1664 auf die 4.2.0-Browser-Runtime an und bricht ab, wenn die erwartete Stelle nicht eindeutig gefunden oder der Fix nicht verifiziert werden kann
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

v13 stellte auf den dedizierten Text-only-ONNX-Export um. Die sichtbare Ladeanzeige verwendete `progress_total` für den Gesamtfortschritt und zeigte zusätzlich die tatsächlich gemeldeten Dateimengen.

Beim realen Ziel-iPhone lief `model_q4f16.onnx_data` zunächst bis **423 von 448 MB** und später bis **438 von 448 MB / 98 %**. Danach war im beobachteten Zeitraum kein weiterer sichtbarer Fortschritt erkennbar. Damit war bestätigt, dass v13 tatsächlich die richtige Textdatei lud und die frühere 94-%-Anzeige nicht mehr das Hauptproblem war. Der Versuch erreichte trotzdem nicht `KI ist bereit ✓`.

Bei der anschließenden Prüfung wurde ein bestätigter Fehler in exakt der verwendeten Abhängigkeit Transformers.js 4.2.0 gefunden: Bei aktivem `progress_callback` können Modelldateien mehrfach angefordert werden (`huggingface/transformers.js` Issue #1663). Upstream wurde dies mit PR #1664 und Merge-Commit `f7487c737aa8cafbc106c9adf69dc9578c8f3fe0` korrigiert.

Bewertung: **Der reale v13-Stillstand beweist allein nicht, dass dieser Runtime-Fehler seine einzige Ursache war.** Der bekannte Fehler betrifft jedoch exakt unseren Runtime-/Callback-Pfad und musste deshalb vor einem weiteren belastbaren iPhone-Test entfernt werden.

### Qwen 3.5 0.8B Text – v14

v14 behält Modell, Revision, Text-only-Architektur und adaptive Quantisierung aus v13 unverändert bei. Geändert wurde der lokal gebündelte Transformers.js-4.2.0-Build: Er übernimmt exakt die upstream korrigierte Normalisierung des Memoize-Schlüssels aus PR #1664. Der Build prüft hart, dass die alte fehlerhafte Stelle genau einmal gefunden, ersetzt und anschließend nicht mehr vorhanden ist.

Zusätzlich entfernt v14 beim ersten Öffnen einmalig einen zurückgebliebenen v13-Startmarker. Danach bleibt der Crash-Loop-Schutz aktiv; ein neuer unvollständiger Start blockiert weiterhin einen automatischen zweiten Großdownload.

Der entscheidende reale iPhone-Test von v14 steht noch aus. Qwen 3.5 0.8B Text gilt daher weiterhin **weder als iPhone-stabil noch als fachlich geeignet bestätigt**.

## v14 – GitHub/Deployment

### Technische Änderungen

- unverändert dediziertes Textmodell `onnx-community/Qwen3.5-0.8B-Text-ONNX`
- unverändert feste Revision `1e45daba048899e7f771657ada617ec49350aa91`
- unverändert `q4f16` bei `shader-f16`, sonst `q4`
- Transformers.js-4.2.0-Bundle mit bestätigtem Upstream-Fix aus Issue #1663 / PR #1664
- Build bricht ab, wenn die erwartete Memoize-Stelle nicht eindeutig gepatcht werden kann
- einmalige Migration eines zurückgebliebenen v13-Startmarkers
- Crash-Loop-Schutz nach der Migration weiterhin aktiv und automatisiert geprüft
- Service-Worker-Cache auf `heb-assist-shell-v40` erhöht
- sichtbare App-Build-ID auf `2026-09-06-v14` erhöht

### GitHub-Actions-Lauf #127

Der erste v14-Lauf wurde **nicht deployed**. Der bewusst strenge Runtime-Build fand die erwartete Upstream-Stelle im kompilierten npm-Bundle wegen einer leicht anderen Bundle-Form nicht und brach ab. Dadurch wurde kein unbestätigter Patch veröffentlicht.

### GitHub-Actions-Lauf #128

Ein Diagnose-Lauf protokollierte ausschließlich die technische Bundle-Struktur um `local_files_only` und wurde ebenfalls bewusst vor dem Deploy gestoppt. Dabei wurde die tatsächliche fehlerhafte Memoize-Stelle des 4.2.0-Bundles eindeutig identifiziert. Es wurden keine Falltexte oder personenbezogenen Daten protokolliert.

### GitHub-Actions-Lauf #129

Der exakt auf die Bundle-Struktur angepasste Upstream-Patch bestand Runtime-Build, JavaScript-Syntax, Text-only-Architektur und beide synthetischen Sicherheits-/Evidence-Prüfungen. Vier Browser-Smoke-Tests des Crash-Loop-Schutzes schlugen jedoch fehl, weil der Test noch einen v13-Startmarker setzte, den die neue einmalige v14-Migration absichtlich entfernt.

Ergebnis: **24 von 28 Browser-/Mobile-Tests bestanden; Deploy wurde korrekt blockiert.** Die Schutzlogik wurde nicht abgeschwächt. Der Test wurde so angepasst, dass er den Crash-Loop-Schutz nach bereits erfolgter v14-Migration prüft.

### GitHub-Actions-Lauf #130 – aktuell veröffentlichter App-Stand

Commit: `921682b868044b9be181c46b4c456d5788b75983`

Der Lauf ist vollständig erfolgreich abgeschlossen:

- Transformers.js-4.2.0-Browser-Runtime mit bestätigtem Upstream-Fix #1664 gebaut
- JavaScript-Syntaxprüfungen bestanden
- Qwen-3.5-Text-only-Architekturprüfung bestanden
- Qwen-3.5-Textsupport der lokalen Runtime geprüft
- gemeinsame `ai-engine.js`-Modulinstanz geprüft
- iOS-Crash-Loop-Schutz nach v14-Migration geprüft
- synthetische Evidence-/Sicherheitsregressionen bestanden
- Chromium und WebKit bestanden
- Android-ähnlicher Chromium-Viewport bestanden
- iPhone-ähnlicher WebKit-Viewport bestanden
- alle **28 von 28 Browser-/Mobile-Smoke-Tests** bestanden
- GitHub-Pages-Artefakt erfolgreich erstellt und hochgeladen
- GitHub Pages hat den Deploy für Build-Version `921682b868044b9be181c46b4c456d5788b75983` erfolgreich gemeldet

Die Test-Web-App wird unter `https://ys2mm422yb-max.github.io/HEB-Assist/` veröffentlicht.

Diese automatisierten Tests beweisen weiterhin **nicht**, dass Qwen 3.5 0.8B Text auf dem realen Ziel-iPhone vollständig initialisiert oder fachlich ausreichend gute HEB-Texte erzeugt.

## Nächster realer Test

Beim nächsten iPhone-Test soll zunächst ausschließlich geprüft werden:

1. die aktuell festgefahrene v13-App vollständig schließen,
2. HEB Assist neu öffnen; keinen Cache löschen und die PWA nicht neu installieren,
3. für diesen Test nach Möglichkeit eine stabile einzelne Netzwerkverbindung beibehalten,
4. beobachten, ob der Download jetzt bis zum vollständigen Dateidownload fortschreitet,
5. prüfen, ob danach ausdrücklich `KI wird initialisiert` und schließlich `KI ist bereit ✓` erreicht wird,
6. falls der Prozess unerwartet abbricht, prüfen, ob beim erneuten Öffnen der automatische Großdownload durch den Crash-Loop-Schutz gestoppt wird.

Ein bereits abgebrochener Teil-Download muss vom Browser nicht zwingend vollständig fortsetzbar sein. Deshalb darf für den ersten v14-Versuch nicht versprochen werden, dass die letzten 10 MB aus v13 einfach weitergeladen werden.

Erst wenn der Modellstart bestanden ist, folgt die fachliche Prüfung mit vollständig synthetischen HEB-Fällen.

## Weiterhin offen

- vollständiger v14-Modellstart auf dem realen Ziel-iPhone bis `KI ist bereit ✓`
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
