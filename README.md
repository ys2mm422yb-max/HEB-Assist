# HEB-Assist

HEB-Assist ist eine eigenständige, mobile Web-App/PWA zur Unterstützung bei fachlichen Formulierungen für HEB-Dokumentation im sozialpsychiatrischen Bereich.

## Ziel

Mitarbeitende beschreiben eine Situation in normaler Alltagssprache. HEB-Assist erzeugt daraus einen fachlich nachvollziehbaren, wertschätzenden und ressourcenorientierten Formulierungsvorschlag, ohne neue Tatsachen hinzuzuerfinden.

## Verbindliche Grundprinzipien

- **Eigenständiges Projekt:** keine technische, inhaltliche oder datenbezogene Verbindung zu anderen Projekten.
- **Mobile first:** iPhone, Android und Desktop werden als gleichwertige Zielplattformen behandelt.
- **Datensparsamkeit:** Version 1 benötigt keine zentrale Datenbank und keine Benutzerkonten.
- **Keine Fallablage:** HEB-Eingaben und KI-Ausgaben werden standardmäßig nicht zentral gespeichert.
- **Lokale KI:** Ziel für Version 1 ist die Inferenz direkt im Browser auf dem Endgerät.
- **Identifizierende Daten blockieren:** Namen, vollständige Geburtsdaten, Adressen, Telefonnummern, E-Mail-Adressen, Akten-/Versichertennummern und vergleichbare Identifikatoren sollen vor der Verarbeitung erkannt werden.
- **Keine Halluzinationen:** Die KI darf keine Diagnosen, Fähigkeiten, Einschränkungen, Ereignisse, Ziele oder Unterstützungsbedarfe erfinden.
- **Fachliche Trennung:** Beobachtung, Selbstaussage und fachliche Einschätzung werden nicht vermischt.
- **Menschliche Verantwortung:** Ausgaben sind Formulierungsvorschläge und müssen vor Übernahme fachlich geprüft werden.

## Technik – v1

- React + Vite
- Progressive Web App
- lokale Browser-Inferenz mit Transformers.js/WebGPU
- zunächst Qwen3-0.6B als technischer Kandidat; die fachliche Qualität wird separat getestet
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank in v1

## Entwicklungsworkflow

`main` bleibt stabil. Änderungen erfolgen über einen eigenen Branch und Pull Request. Vor einem Merge müssen Build, Datenschutzregeln und Kernfunktionen geprüft werden.

## Aktueller Status

Bootstrap/Prototyp. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.**
