# HEB-Assist

HEB-Assist ist eine eigenständige, mobile Web-App/PWA zur Unterstützung bei fachlichen Formulierungen für HEB-Dokumentation im sozialpsychiatrischen Bereich.

## Ziel

Mitarbeitende beschreiben eine Situation in normaler Alltagssprache. HEB-Assist erzeugt daraus einen fachlich nachvollziehbaren, wertschätzenden und ressourcenorientierten Formulierungsvorschlag, ohne neue Tatsachen hinzuzuerfinden.

## Verbindliche Grundprinzipien

- **Eigenständiges Projekt:** keine technische, inhaltliche oder datenbezogene Verbindung zu anderen Projekten.
- **Mobile first:** iPhone, Android und Desktop werden als gleichwertige Zielplattformen behandelt.
- **Datensparsamkeit:** Version 1 benötigt keine zentrale Datenbank und keine Benutzerkonten.
- **Keine Fallablage:** HEB-Eingaben und Ausgaben werden standardmäßig nicht zentral gespeichert.
- **Lokale Verarbeitung:** Der normale Schnellmodus verarbeitet die Eingabe vollständig im Browser auf dem Endgerät.
- **Identifizierende Daten blockieren:** Typische direkte Identifikatoren werden vor der Verarbeitung lokal geprüft und bei Treffern blockiert.
- **Keine erfundenen Tatsachen:** Diagnosen, Fähigkeiten, Einschränkungen, Ereignisse, Entwicklungen, Ziele oder Unterstützungsbedarfe dürfen nicht frei ergänzt werden.
- **Fachliche Trennung:** Beobachtung, Selbstaussage und fachliche Einschätzung werden nicht vermischt.
- **Menschliche Verantwortung:** Ausgaben sind Formulierungsvorschläge und müssen vor Übernahme fachlich geprüft werden.

## Fachliche Grundlage

HEB-Assist orientiert sich an den offiziellen bayerischen HEB-Bögen für Menschen mit einer wesentlichen seelischen Behinderung:

- HEB A – Vorläufige Hilfeplanung
- HEB B – Entwicklungsbericht
- HEB C – Abschlussbericht

Die fünf offiziellen HEB-Bereiche werden unverändert als Hauptbereiche verwendet. Details stehen in `HEB_REFERENCE.md`.

## Technik – aktueller Prototyp

- statische HTML/CSS/JavaScript-Web-App ohne Backend
- Progressive Web App mit Service Worker und App-Shell-Cache
- normaler Schnellmodus ohne großes Modell und ohne KI-Server
- lokaler Datenschutzfilter vor jeder Formulierung
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank
- keine zentrale Fallhistorie und kein Login in Version 1

### Entscheidung nach iPhone-Gerätetest

Der erste WebGPU-Versuch mit `onnx-community/Qwen2.5-0.5B-Instruct` war auf dem getesteten iPhone nicht praxistauglich: Der mehrere hundert MB große Modelldownload dauerte mehrere Minuten und der Start brach anschließend ab. Deshalb ist ein großes lokales Sprachmodell **nicht mehr Voraussetzung für die normale Nutzung**.

Der aktuelle Schnellmodus erzeugt den vollständigen, zum gewählten HEB-Bogen passenden Entwurf sofort lokal. Ein stärkeres lokales Sprachmodell bleibt ein separates Forschungs-/Qualitätsthema und darf die mobile Grundfunktion nicht blockieren.

## Aktuell implementiert

- mobile Oberfläche für iPhone, Android und Desktop
- Auswahl HEB A / B / C
- die fünf offiziellen HEB-Bereiche
- ein einziges Eingabefeld in Alltagssprache
- ein einziger Button für den vollständigen HEB-Entwurf
- automatische Struktur passend zu A, B oder C
- lokaler Datenschutzfilter für typische direkte Identifikatoren
- PWA-Manifest und Offline-App-Shell
- Kopierfunktion

## Entwicklungsworkflow

`main` bleibt stabil. Änderungen erfolgen über einen eigenen Branch und Pull Request. Vor einem Merge müssen Kernfunktionen, Datenschutzregeln und Gerätekompatibilität geprüft werden.

## Aktueller Status

Bootstrap/Prototyp. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.**

Netlify ist für den Testbetrieb auf den Feature-Branch `feature/bootstrap-pwa-local-ai-v1` konfiguriert.
