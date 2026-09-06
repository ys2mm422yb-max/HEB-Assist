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
- keine Übertragung von HEB-Eingaben an GitHub Pages, Hugging Face oder einen sonstigen externen KI-Inferenzdienst zur Textgenerierung

## Netzwerkzugriffe – v12

Für den Betrieb werden folgende externe Ressourcen benötigt:

- **GitHub Pages:** Auslieferung der App-Dateien einschließlich der beim Deploy lokal gebündelten Transformers.js-/ONNX-Web-Runtime
- **Hugging Face:** Download der für Qwen 3.5 0.8B benötigten Modellressourcen beim ersten Start bzw. wenn diese nicht mehr im Browser-Cache vorhanden sind

HEB-Assist verwendet in v12 keine externe JavaScript-CDN für die KI-Laufzeit. Transformers.js und die benötigten ONNX-Web-Runtime-Dateien werden beim GitHub-Actions-Deploy aus den npm-Abhängigkeiten erzeugt und anschließend von GitHub Pages zusammen mit der App ausgeliefert.

Für die HEB-Generierung fordert die Anwendung nur die Textkomponenten des Qwen-3.5-Modells an. Ein Vision-Encoder wird von HEB-Assist nicht für die Textgenerierung verwendet.

Die Modell-Downloads von Hugging Face enthalten keinen HEB-Falltext als KI-Inferenzanfrage. Normale technische Verbindungsmetadaten wie IP-Adresse, User-Agent und Zeitstempel können bei den beteiligten Infrastrukturbetreibern anfallen.

Nach erfolgreichem Start des Modells erfolgt die eigentliche Textgenerierung lokal im Browser auf dem Endgerät. Der HEB-Falltext wird dabei nicht an einen externen KI-Inferenzserver geschickt.

Browser und Betriebssystem entscheiden über Cache-Speicherung und mögliche Speicherbereinigung. Deshalb darf nicht garantiert werden, dass Modellressourcen dauerhaft lokal gespeichert bleiben oder niemals erneut geladen werden müssen.

## Technischer Startschutz auf iOS

Um nach einem unerwarteten Safari-/PWA-Prozessabbruch keine automatische Großdownload-Schleife auszulösen, speichert v12 vorübergehend einen lokalen Startmarker in `localStorage`.

Dieser Marker enthält ausschließlich:

- das technische Modellprofil
- den Zeitpunkt des begonnenen Modellstarts

Er enthält **keinen Falltext, keine HEB-Ausgabe und keine personenbezogenen Angaben**. Nach einem erfolgreichen Modellstart oder einem regulär abgefangenen technischen Fehler wird der Marker entfernt. Wird ein vorheriger Start als unvollständig erkannt, wird ein automatischer erneuter Modelldownload gestoppt; ein neuer Versuch muss bewusst manuell ausgelöst werden.

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
