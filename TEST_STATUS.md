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

## Reale iPhone-Modelltests

### Llama 3.2 1B Instruct

Startete vergleichsweise stabil, erzeugte aber mehrfach grammatikalisch und fachlich unbrauchbare HEB-Ausgaben. Für die gewünschte freie HEB-Synthese nicht ausreichend.

### Qwen 3 0.6B

Lief auf dem iPhone grundsätzlich, war fachlich jedoch nicht zuverlässig genug. Die gewünschte semantische HEB-Synthese gelang nicht stabil; frühere Analyse-plus-Reviewer-Abläufe waren zusätzlich zu langsam.

Bewertung: **Qwen 3 0.6B wird für die eigentliche HEB-Generierung nicht weiterverwendet.**

### Qwen 3 1.7B – v10

Der neue v10-Stand wurde auf dem realen iPhone getestet.

Beobachtung:

- der Modelldownload lief bis **100 %** durch.
- direkt anschließend, beim Start/Initialisieren des Modells, brach der Safari-Webseitenprozess ab.
- Safari zeigte anschließend: „Auf … ist wiederholt ein Problem aufgetreten.“
- die App erreichte **nicht** den Zustand „KI ist bereit“.
- dadurch konnte die eigentliche HEB-Generierung mit Qwen 3 1.7B auf diesem Gerät nicht getestet werden.

Die WebLLM-Referenzkonfiguration führt `Qwen3-1.7B-q4f16_1-MLC` mit rund **2036,66 MB VRAM** bei 4096 Kontext-Tokens. HEB Assist hatte das Kontextfenster bereits auf 2048 Tokens reduziert; der exakte Speicherbedarf dieses reduzierten Profils ist daher niedriger und nicht identisch mit dem Referenzwert. Der reale iPhone-Abbruch direkt nach 100 % Download ist dennoch **stark mit einem Speicher-/WebGPU-Initialisierungsproblem vereinbar**. Eine exakte iOS-Prozessspeichergrenze ist aus der PWA heraus nicht messbar, daher wird OOM nicht als mathematisch bewiesene Einzelursache behauptet.

Bewertung: **Qwen 3 1.7B ist im aktuellen WebLLM/PWA-Ansatz auf dem getesteten iPhone nicht praktisch einsetzbar. Weitere identische Download-/Startversuche sind nicht sinnvoll.**

## v10 – technischer GitHub-Stand

GitHub-Actions-Lauf **#108** für Commit `3f48399a9c7f1ae5ce78abcecafaf793ddfd3823` ist vollständig erfolgreich abgeschlossen. GitHub Pages wurde im selben Lauf erfolgreich deployed.

Bestanden sind unter anderem:

- lokale Bereitstellung der WebLLM-Laufzeit
- JavaScript-Syntax
- v10-Architekturcheck
- synthetische Sicherheitsregressionen
- Chromium-/WebKit-Smoke-Tests
- iPhone-/Android-ähnliche Layouts
- HEB A/B/C und offizielle Hauptbereiche
- Dark Mode
- Manifest und Service Worker

Diese Tests ersetzen keine echte iPhone-WebGPU-Inferenz. Der reale iPhone-Test hat genau diese Lücke sichtbar gemacht.

## Konsequenz aus v10

Die bisherigen realen Tests zeigen aktuell einen Zielkonflikt im reinen Browseransatz:

- kleine Modelle passen eher in Safari/WebGPU, liefern aber nicht zuverlässig die gewünschte HEB-Qualität.
- deutlich stärkere Modelle benötigen mehr Speicher; Qwen 3 1.7B scheitert auf dem getesteten iPhone bereits beim Initialisieren.

Deshalb wird **nicht weiter blind an Qwen 3 1.7B gepatcht**. Vor der nächsten produktiven Modelländerung muss ein neuer lokaler KI-Weg gewählt und begründet werden.

Als nächste sinnvolle Entwicklungsrichtungen werden geprüft:

1. ein stärker auf HEB spezialisiertes, kleineres lokales Modell (z. B. durch Training/Feinabstimmung ausschließlich mit synthetischen HEB-Fällen), das innerhalb des iPhone-Speicherbudgets bleibt;
2. alternativ eine native On-Device-Inferenz für Plattformen, auf denen Browser/WebGPU die benötigte Modellgröße nicht stabil trägt.

Die Vorgaben bleiben unverändert: kein externer KI-Inferenzserver für Falltexte, keine echte Falldaten in Entwicklung/Tests und kein versteckter regelbasierter Ersatz-HEB.

## Noch offen

- Auswahl und technischer Nachweis des nächsten lokalen KI-Ansatzes.
- echter Offline-Test mit einem Modell, das auf dem Ziel-iPhone tatsächlich vollständig startet.
- fachliche Qualitätstests mit mehreren synthetischen HEB-A/B/C-Fällen.
- mehrere aufeinanderfolgende Generierungen auf realem iPhone.
- echter Android-WebGPU-Test.
- echter Desktop-WebGPU-Test.

## Freigaberegel

Bis diese Punkte fachlich und technisch ausreichend geprüft sind, keine echten Falldaten verwenden und keine produktive Freigabe behaupten.
