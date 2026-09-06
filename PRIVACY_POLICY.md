# PRIVACY_POLICY – technische Datenschutzregeln

> Entwicklungsregelwerk für HEB-Assist. Dies ist noch keine abschließende rechtliche Datenschutzerklärung für einen späteren Produktivbetrieb.

## Datenschutz-Zielbild für v1

HEB-Assist soll HEB-Formulierungen erzeugen, ohne Falltexte zentral zu speichern. Die eigentliche KI-Inferenz erfolgt direkt auf dem verwendeten Endgerät im Browser.

## Daten, die nicht eingegeben werden sollen

Der Eingabefilter soll insbesondere erkennen bzw. blockieren:

- Vor- und Nachnamen bzw. offensichtliche Personennamen
- vollständige Geburtsdaten
- vollständige postalische Adressen
- Telefonnummern
- E-Mail-Adressen
- Versicherungs-, Akten-, Bewohner- oder vergleichbare Identifikationsnummern
- eindeutige Kombinationen aus personenbezogenen Merkmalen, soweit technisch erkennbar

Kein automatischer Filter kann vollständige Anonymität garantieren. Die Benutzeroberfläche muss deshalb zusätzlich klar darauf hinweisen, nur nicht identifizierende Beschreibungen einzugeben.

## Speicherung

In v1 gilt:

- keine zentrale Datenbank für Falltexte
- keine serverseitige Chat-Historie
- keine Analytics mit Texteingaben
- keine Fehlerlogs mit vollständigen Texteingaben
- keine Übertragung von HEB-Eingaben an GitHub Pages, Hugging Face, MLC/WebLLM oder einen sonstigen externen KI-Inferenzdienst zur Textgenerierung

## Netzwerkzugriffe – aktueller Entwicklungsstand v15

Für den Betrieb werden folgende externe Ressourcen benötigt:

- **GitHub Pages:** Auslieferung der statischen HEB-Assist-App einschließlich der beim Deploy lokal gebündelten WebLLM-JavaScript-Runtime
- **Modell-/Runtime-Ressourcen des WebLLM-Modellprofils:** erstmaliger Download der Qwen-3.5-0.8B-MLC-Modellgewichte und der zugehörigen WebGPU-Modellbibliothek bzw. erneuter Download, wenn der Browser-Cache nicht mehr vorhanden ist

HEB-Assist verwendet keine externe JavaScript-CDN für die WebLLM-JavaScript-Laufzeit. `@mlc-ai/web-llm` 0.2.84 wird beim GitHub-Actions-Deploy installiert und als `vendor/webllm.js` zusammen mit der PWA von GitHub Pages ausgeliefert.

Verwendet wird das WebLLM-Modellprofil `Qwen3.5-0.8B-q4f16_1-MLC`. Es handelt sich für HEB-Assist um ein Textmodell; Bild-/Vision-Modellteile werden nicht verwendet.

Die technischen Modell-Downloads enthalten keinen HEB-Falltext als KI-Inferenzanfrage. Normale technische Verbindungsmetadaten wie IP-Adresse, User-Agent und Zeitstempel können bei den beteiligten Infrastrukturbetreibern anfallen.

Nach erfolgreichem Start des Modells erfolgt die eigentliche Textgenerierung lokal im Browser auf dem Endgerät. Der HEB-Falltext wird dabei nicht an einen externen KI-Inferenzserver geschickt.

## Lokaler Modell-Cache

v15 konfiguriert WebLLM mit der Browser Cache API und fordert best-effort persistenten Website-Speicher an. Browser und Betriebssystem entscheiden jedoch über Cache-Speicherung und mögliche Speicherbereinigung.

Deshalb darf **nicht garantiert** werden, dass Modellressourcen dauerhaft lokal gespeichert bleiben oder niemals erneut geladen werden müssen. Ein späterer Offlinebetrieb ist erst nach einem vollständig erfolgreichen realen Geräte-Test belastbar zu beurteilen.

## Technischer Startschutz auf iOS

Um nach einem unerwarteten Safari-/PWA-Prozessabbruch keine automatische Großdownload-Schleife auszulösen, speichert HEB-Assist vorübergehend einen lokalen Startmarker in `localStorage`.

Dieser Marker enthält ausschließlich:

- das technische Modellprofil
- den Zeitpunkt des begonnenen Modellstarts

Er enthält **keinen Falltext, keine HEB-Ausgabe und keine personenbezogenen Angaben**. Nach einem erfolgreichen Modellstart oder einem regulär abgefangenen technischen Fehler wird der Marker entfernt. Wird ein vorheriger Start als unvollständig erkannt, wird ein automatischer erneuter Modelldownload gestoppt; ein neuer Versuch muss bewusst manuell ausgelöst werden.

v15 entfernt beim ersten Öffnen einmalig alte Startmarker der vorherigen Transformers.js-/ONNX-Architektur. Dabei werden keine Fall- oder HEB-Daten gelesen oder verändert. Danach bleibt der Startschutz für neue WebLLM-Modellstarts aktiv.

## Datenschutzfilter

Der lokale Datenschutzfilter soll typische direkte Identifikatoren blockieren, bevor eine HEB-Generierung gestartet werden kann. Er ist eine zusätzliche technische Schutzschicht und **keine Garantie vollständiger Anonymisierung**. Deshalb dürfen in der Entwicklungs- und Testphase ausschließlich vollständig synthetische Fälle verwendet werden.

## Entwicklung und Tests

- ausschließlich vollständig synthetische Testfälle
- keine echten Bewohner-/Klientendaten in Git, Commits, PRs, Issues, Tests, Screenshots oder Dokumentation
- kein Debug-Logging des vollständigen Nutzereingabetextes
- keine Telemetrie, die HEB-Eingaben oder HEB-Ausgaben überträgt
- sicherheitsrelevante Änderungen werden nachvollziehbar dokumentiert

## Produktivfreigabe

Vor einer tatsächlichen Nutzung mit beruflichen Falldokumentationen sind mindestens erforderlich:

1. fachliche Freigabe der Formulierungslogik,
2. Datenschutzprüfung der realen Bereitstellung und Hosting-Konfiguration,
3. Prüfung der verwendeten Modell- und Bibliothekslizenzen,
4. Tests auf den tatsächlich eingesetzten iOS-/Android-Geräten,
5. klare Nutzerhinweise zu nicht identifizierenden Eingaben und menschlicher Endkontrolle.
