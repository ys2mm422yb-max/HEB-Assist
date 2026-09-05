# HEB-Assist

HEB-Assist ist eine eigenständige, mobile Web-App/PWA zur Unterstützung bei fachlichen Formulierungen für HEB-Dokumentation im sozialpsychiatrischen Bereich.

## Ziel

Mitarbeitende beschreiben eine Situation in normaler Alltagssprache. HEB-Assist erzeugt daraus einen fachlich nachvollziehbaren, wertschätzenden und ressourcenorientierten Formulierungsvorschlag, ohne neue Tatsachen hinzuzuerfinden.

## Verbindliche Grundprinzipien

- **Eigenständiges Projekt:** keine technische, inhaltliche oder datenbezogene Verbindung zu anderen Projekten.
- **Mobile first:** iPhone, Android und Desktop werden als gleichwertige Zielplattformen behandelt.
- **Datensparsamkeit:** Version 1 benötigt keine zentrale Datenbank und keine Benutzerkonten.
- **Keine Fallablage:** HEB-Eingaben und Ausgaben werden standardmäßig nicht zentral gespeichert.
- **Lokale Verarbeitung:** Sowohl Schnellmodus als auch lokales Sprachmodell arbeiten auf dem Endgerät.
- **Identifizierende Daten blockieren:** Typische direkte Identifikatoren werden vor der Verarbeitung lokal geprüft und bei Treffern blockiert.
- **Keine erfundenen Tatsachen:** Diagnosen, Fähigkeiten, Einschränkungen, Ereignisse, Entwicklungen, Ziele oder Unterstützungsbedarfe dürfen nicht frei ergänzt werden.
- **Fachliche Trennung:** Beobachtung, Selbstaussage und fachliche Einschätzung werden nicht vermischt.
- **Menschliche Verantwortung:** Ausgaben sind Formulierungsvorschläge und müssen vor Übernahme fachlich geprüft werden.
- **Automatische Updates:** veröffentlichte App-Versionen werden automatisch erkannt und übernommen; Kolleginnen und Kollegen sollen weder Cache leeren noch die PWA neu installieren müssen.

## Fachliche Grundlage

HEB-Assist orientiert sich an den offiziellen bayerischen HEB-Bögen für Menschen mit einer wesentlichen seelischen Behinderung:

- HEB A – Vorläufige Hilfeplanung
- HEB B – Entwicklungsbericht
- HEB C – Abschlussbericht

Die fünf offiziellen HEB-Bereiche werden unverändert als Hauptbereiche verwendet. Details stehen in `HEB_REFERENCE.md`.

## Technik – aktueller Prototyp

- statische HTML/CSS/JavaScript-Web-App ohne Backend
- Progressive Web App mit Service Worker und App-Shell-Cache
- automatisch aktualisierende App-Shell: Update-Prüfung beim Öffnen, beim Zurückkehren in die App und regelmäßig während längerer Nutzung
- online werden HTML/JavaScript/CSS bevorzugt frisch geladen; vorhandener Cache dient als Offline-Fallback
- ein Update wird automatisch aktiviert, aber bei aktiver HEB-Eingabe nicht durch einen erzwungenen Neustart mit Datenverlust übernommen
- sofort nutzbarer lokaler Schnellmodus
- stärkeres lokales Sprachmodell (`onnx-community/Qwen2.5-0.5B-Instruct`) wird nach dem Öffnen automatisch im Hintergrund vorbereitet
- klar sichtbarer KI-Status mit Ladefortschritt, Bereitschaft oder Fallback-Zustand
- wenn das Sprachmodell noch lädt oder fehlschlägt, blockiert es die App nicht: Entwürfe werden sofort im Schnellmodus erstellt
- sobald „KI ist bereit ✓“ angezeigt wird, werden neue Entwürfe mit dem stärkeren lokalen Sprachmodell erstellt
- lokaler Datenschutzfilter vor jeder Formulierung
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank
- keine zentrale Fallhistorie und kein Login in Version 1

### Ergebnis des ersten iPhone-Gerätetests

Der erste manuelle Start des WebGPU-Modells war auf dem getesteten iPhone nicht praxistauglich: Der mehrere hundert MB große Modelldownload dauerte mehrere Minuten und der Start brach anschließend ab. Deshalb darf das große lokale Sprachmodell die Bedienung nicht blockieren.

Die aktuelle Architektur kombiniert deshalb beides: HEB-Assist ist sofort nutzbar, während das stärkere Modell automatisch im Hintergrund lädt. Wenn es erfolgreich bereitsteht, übernimmt es neue Formulierungen. Wenn nicht, bleibt der Schnellmodus aktiv.

## Aktuell implementiert

- mobile Oberfläche für iPhone, Android und Desktop
- Auswahl HEB A / B / C
- die fünf offiziellen HEB-Bereiche
- ein einziges Eingabefeld in Alltagssprache
- ein einziger Button für den vollständigen HEB-Entwurf
- automatische Struktur passend zu A, B oder C
- sichtbarer Status des lokalen Sprachmodells
- automatisches Hintergrundladen des Sprachmodells
- sofortiger lokaler Fallback ohne Wartezeit
- lokaler Datenschutzfilter für typische direkte Identifikatoren
- automatische PWA-Update-Erkennung und sichere Übernahme neuer Versionen
- PWA-Manifest und Offline-App-Shell
- Kopierfunktion

## Entwicklungsworkflow

`main` bleibt stabil. Änderungen erfolgen über einen eigenen Branch und Pull Request. Vor einem Merge müssen Kernfunktionen, Datenschutzregeln und Gerätekompatibilität geprüft werden.

## Aktueller Status

Bootstrap/Prototyp. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.**

Netlify ist für den Testbetrieb auf den Feature-Branch `feature/bootstrap-pwa-local-ai-v1` konfiguriert.
