# HEB-Assist – Teststatus

Stand: 2026-09-06

## Verbindlicher Status

HEB-Assist ist weiterhin ein Test-/Entwicklungsprojekt. Bis zur fachlichen und datenschutzrechtlichen Freigabe dürfen ausschließlich vollständig synthetische Testfälle verwendet werden.

## Aktueller technischer Stand – v11

Der aktuell veröffentlichte Entwicklungsstand verwendet **Gemma 3 1B** über **Transformers.js 4.2.0 / ONNX Runtime WebGPU**.

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

### Lauf #116

Commit `610283efb2a7a54190854d81b0c7ff76dbba752f` korrigierte zunächst die Pfade der ONNX-WebGPU-Runtime-Dateien. GitHub-Actions-Lauf #116 war vollständig grün und wurde erfolgreich auf GitHub Pages veröffentlicht.

Der anschließende reale iPhone-Test zeigte jedoch unmittelbar beim Runtime-Import den Fehler:

`Module name, 'onnxruntime-web/webgpu' does not resolve to a valid URL.`

Damit war klar, dass noch keine Modellinitialisierung stattgefunden hatte. Ursache war, dass `transformers.web.min.js` absichtlich externe npm-Imports für ONNX Runtime enthält und ohne Bundler/Import-Map nicht als eigenständiges Browser-Modul verwendet werden darf.

### Lauf #117

Commit `a013da4f7ec772785831d487a9be8e7fc68de5ac` ergänzte erstmals einen echten Browser-Modulimport-Test. Dieser Lauf wurde korrekt **nicht deployed**, weil der Test einen weiteren nicht aufgelösten Import `onnxruntime-common` erkannte. Ergebnis: 20 Tests bestanden, 4 neue Runtime-Import-Tests schlugen fehl. Dadurch wurde ein fehlerhafter neuer Pages-Stand verhindert.

### Lauf #118 – aktuell veröffentlichter App-Stand

Commit `2b9b297f25bc6a1c4ec094183cb8c195e825e3f2` stellt den Runtime-Build auf die von Transformers.js selbst erzeugte **gebündelte Browser-Datei `transformers.min.js`** um. Die vorher verwendete `transformers.web.min.js` wird für HEB Assist nicht mehr als Browser-Runtime ausgeliefert.

GitHub-Actions-Lauf **#118** ist vollständig erfolgreich abgeschlossen:

- offizielle gebündelte Transformers.js-Browser-Runtime vorbereitet
- JavaScript-Syntaxprüfungen bestanden
- v11-Architekturprüfung bestanden
- synthetische Evidence-/Sicherheitsregressionen bestanden
- echter Browser-Modulimport der lokalen Transformers.js-Runtime ohne npm-Auflösungsfehler bestanden
- Chromium und WebKit bestanden
- Android-ähnlicher Chromium-Viewport bestanden
- iPhone-ähnlicher WebKit-Viewport bestanden
- **24 von 24 Browser-Smoke-Tests bestanden**
- GitHub-Pages-Artefakt erfolgreich erstellt und hochgeladen
- Pages-Deployment für exakt Commit `2b9b297f25bc6a1c4ec094183cb8c195e825e3f2` erstellt
- GitHub Pages meldete anschließend ausdrücklich `success`

Die Test-Web-App wird unter `https://ys2mm422yb-max.github.io/HEB-Assist/` veröffentlicht.

Diese automatisierten Tests beweisen weiterhin **nicht**, dass die echte WebGPU-Modellinitialisierung auf dem realen Ziel-iPhone stabil durchläuft oder fachlich ausreichend gute HEB-Texte erzeugt. Der reale Test hat inzwischen gezeigt, dass Gemma 3 1B auf dem Ziel-iPhone nicht bis zum Zustand „KI ist bereit“ kommt.

Reine spätere Markdown-Dokumentationsänderungen lösen keinen Pages-Deploy aus und verändern den veröffentlichten App-Code nicht.

## Reale iPhone-Modelltests – bisherige Erkenntnisse

### Llama 3.2 1B Instruct

Startete vergleichsweise stabil, erzeugte aber mehrfach grammatikalisch und fachlich unbrauchbare HEB-Ausgaben. Für die gewünschte freie HEB-Synthese nicht ausreichend.

### Qwen 3 0.6B

Lief auf dem iPhone grundsätzlich, war fachlich jedoch nicht zuverlässig genug. Die gewünschte semantische HEB-Synthese gelang im damaligen Stand nicht stabil.

Bewertung: **Qwen 3 0.6B wurde im damaligen Generierungsansatz für die eigentliche HEB-Generierung verworfen.**

### Qwen 3 1.7B – v10

Der Modelldownload lief auf dem realen iPhone bis 100 %. Direkt beim anschließenden Start/Initialisieren brach der Safari-Webseitenprozess ab. Die App erreichte nicht den Zustand „KI ist bereit“.

Bewertung: **Qwen 3 1.7B im damaligen WebLLM/PWA-Ansatz ist auf dem getesteten iPhone nicht praktisch einsetzbar.** Dieser Weg wurde beendet.

### Gemma 3 1B – v11

Der erste reale iPhone-Versuch mit v11 scheiterte noch vor dem Modelldownload am Browser-Modulimport mit `onnxruntime-web/webgpu does not resolve to a valid URL`. Dieser konkrete Runtime-Buildfehler wurde mit Commit `2b9b297f...` korrigiert und ist in den automatischen Browser-Modulimport-Tests nicht mehr reproduzierbar.

Beim anschließenden realen iPhone-Retest mit dem korrigierten Build wird der Modelldownload bis 100 % abgeschlossen. Unmittelbar beim anschließenden Initialisieren erreicht die App jedoch nicht „KI ist bereit“; stattdessen startet der Ladeablauf ohne Nutzereingriff erneut von vorn.

Der aktuelle App-Code enthält innerhalb eines Seitenlaufs keinen automatischen Modell-Neustart nach 100 %. `generatorPromise` verhindert parallele bzw. doppelte Pipeline-Initialisierungen. Das beobachtete Zurückspringen auf einen frischen Ladeablauf ist daher mit einem Neustart des Safari/PWA-Seitenprozesses vereinbar und entspricht funktional einem fehlgeschlagenen realen Modellstart.

Bewertung: **Gemma 3 1B / q4f16 wird auf dem getesteten Ziel-iPhone nicht als stabil einsetzbar bewertet. Weitere wiederholte Downloads dieses Kandidaten sind nicht sinnvoll.**

## Nächster technischer Schritt

Für den nächsten Modellkandidaten gelten zwei harte Kriterien gleichzeitig:

1. Er muss auf dem realen iPhone zuverlässig vollständig initialisieren und mehrfach lokal generieren können.
2. Die HEB-Ausgabe muss mit der aktuellen Evidence-/Sicherheitsarchitektur fachlich ausreichend sein; technisch stabile, aber sprachlich unbrauchbare Ausgabe gilt weiterhin als Fehlschlag.

Vor einem weiteren großen realen iPhone-Download soll der nächste Kandidat soweit möglich anhand Modellgröße, Runtime-Kompatibilität und synthetischer Qualität vorgeprüft werden.

## Weiterhin offen

- Auswahl und Vorprüfung eines kleineren iPhone-tauglichen Modellkandidaten
- vollständiger Modellstart dieses Kandidaten auf dem realen Ziel-iPhone bis „KI ist bereit“
- vollständige HEB-Generierungen mit rein synthetischen Fällen
- fachliche Qualität einschließlich Grammatik, HEB-Struktur, Ressourcenorientierung und fehlender Erfindungen
- mehrere aufeinanderfolgende Generierungen auf dem realen iPhone
- Verhalten nach erneutem Öffnen der PWA und Nutzung des lokalen Modell-Caches
- echter Offline-Test nach einem zuvor vollständig erfolgreichen Modellstart
- echter Android-WebGPU-Test
- echter Desktop-WebGPU-Test
- mehrere synthetische Qualitätstests für HEB A, B und C

## Freigaberegel

Bis die offenen realen Geräte- und Qualitätstests ausreichend bestanden sind, keine echten Falldaten verwenden und keine produktive Freigabe behaupten.
