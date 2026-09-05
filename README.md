# HEB-Assist

HEB-Assist ist eine eigenständige, mobile Web-App/PWA zur Unterstützung bei fachlichen Formulierungen für HEB-Dokumentation im sozialpsychiatrischen Bereich.

## Ziel

Mitarbeitende beschreiben eine Situation in normaler Alltagssprache. HEB-Assist erzeugt daraus einen fachlich nachvollziehbaren, wertschätzenden und ressourcenorientierten Formulierungsvorschlag, ohne neue Tatsachen hinzuzuerfinden.

## Verbindliche Grundprinzipien

- **Eigenständiges Projekt:** keine technische, inhaltliche oder datenbezogene Verbindung zu anderen Projekten.
- **Mobile first:** iPhone, Android und Desktop werden als gleichwertige Zielplattformen behandelt.
- **Datensparsamkeit:** Version 1 benötigt keine zentrale Datenbank und keine Benutzerkonten.
- **Keine Fallablage:** HEB-Eingaben und KI-Ausgaben werden standardmäßig nicht zentral gespeichert.
- **Lokale KI:** Inferenz erfolgt im Browser auf dem Endgerät.
- **Identifizierende Daten blockieren:** Typische direkte Identifikatoren werden vor der KI-Verarbeitung lokal geprüft und bei Treffern blockiert.
- **Keine Halluzinationen:** Die KI darf keine Diagnosen, Fähigkeiten, Einschränkungen, Ereignisse, Ziele oder Unterstützungsbedarfe erfinden.
- **Fachliche Trennung:** Beobachtung, Selbstaussage und fachliche Einschätzung werden nicht vermischt.
- **Menschliche Verantwortung:** Ausgaben sind Formulierungsvorschläge und müssen vor Übernahme fachlich geprüft werden.

## Technik – aktueller Prototyp

- statische HTML/CSS/JavaScript-Web-App ohne Backend
- Progressive Web App mit Service Worker und App-Shell-Cache
- lokale Browser-Inferenz mit Transformers.js 4.2.0 und WebGPU
- Modellkandidat: `onnx-community/Qwen2.5-0.5B-Instruct`
- bevorzugt 4-Bit-Quantisierung (`q4f16`, sofern vom Gerät unterstützt, sonst `q4`)
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank
- keine zentrale Fallhistorie und kein Login in Version 1

Beim ersten KI-Start werden Transformers.js und die Modell-Dateien aus dem Internet geladen. Die eigentliche Fallbeschreibung wird nicht an einen KI-Inferenzserver gesendet; die Generierung läuft auf dem Endgerät.

## Aktuell implementiert

- mobile Oberfläche für iPhone, Android und Desktop
- HEB-Bereichsauswahl
- Gesamtformulierung, Ressourcen, Unterstützungsbedarf sowie Ziel + Maßnahmen
- lokaler Datenschutzfilter für typische direkte Identifikatoren
- lokales HEB-Regelwerk und erste fachliche Few-Shot-Beispiele
- lokale WebGPU-KI
- PWA-Manifest und Offline-App-Shell
- Kopierfunktion und verständliche Fehlerzustände

## Entwicklungsworkflow

`main` bleibt stabil. Änderungen erfolgen über einen eigenen Branch und Pull Request. Vor einem Merge müssen Kernfunktionen, Datenschutzregeln und Gerätekompatibilität geprüft werden.

## Aktueller Status

Bootstrap/Prototyp. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.**

Der nächste harte Qualitätsschritt ist ein echter Gerätetest auf iPhone und Android mit vollständig fiktiven Testfällen. Erst danach wird entschieden, ob das lokale Modell fachlich stark genug ist oder ausgetauscht werden muss.
