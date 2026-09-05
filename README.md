# HEB-Assist

HEB-Assist ist eine eigenständige, mobile Web-App/PWA zur Unterstützung bei fachlichen Formulierungen für HEB-Dokumentation im sozialpsychiatrischen Bereich.

## Ziel

Mitarbeitende beschreiben eine Situation in normaler Alltagssprache. HEB-Assist erzeugt daraus einen fachlich nachvollziehbaren, wertschätzenden und ressourcenorientierten Formulierungsvorschlag, ohne neue Tatsachen hinzuzuerfinden.

## Verbindliche Grundprinzipien

- **Eigenständiges Projekt:** keine technische, inhaltliche oder datenbezogene Verbindung zu anderen Projekten.
- **Mobile first:** iPhone, Android und Desktop werden als gleichwertige Zielplattformen behandelt.
- **Datensparsamkeit:** Version 1 benötigt keine zentrale Datenbank und keine Benutzerkonten.
- **Keine Fallablage:** HEB-Eingaben und Ausgaben werden standardmäßig nicht zentral gespeichert.
- **Lokale Verarbeitung:** Das Sprachmodell arbeitet auf dem Endgerät.
- **Identifizierende Daten blockieren:** Typische direkte Identifikatoren werden vor der Verarbeitung lokal geprüft und bei Treffern blockiert.
- **Keine erfundenen Tatsachen:** Diagnosen, Fähigkeiten, Einschränkungen, Ereignisse, Entwicklungen, Ziele oder Unterstützungsbedarfe dürfen nicht frei ergänzt werden.
- **Fachliche Trennung:** Beobachtung, Selbstaussage und fachliche Einschätzung werden nicht vermischt.
- **Menschliche Verantwortung:** Ausgaben sind Formulierungsvorschläge und müssen vor Übernahme fachlich geprüft werden.
- **Automatische Updates:** veröffentlichte App-Versionen werden automatisch erkannt und übernommen; Kolleginnen und Kollegen sollen weder Cache leeren noch die PWA neu installieren müssen.
- **Kein versteckter Ersatzmodus:** HEB-Texte werden erst verarbeitet, wenn das tatsächliche lokale Sprachmodell vollständig gestartet ist.

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
- lokales Sprachmodell `onnx-community/Qwen2.5-0.5B-Instruct`
- Transformers.js 4.2.0 mit WebGPU
- auf Safari 26+ wird die von Hugging Face später upstream eingebaute Asyncify-WebGPU-Konfiguration explizit gesetzt, weil Transformers.js 4.2.0 diese Safari-26-Korrektur noch nicht enthält
- das Eingabefeld bleibt bis zum vollständigen Modellstart gesperrt
- klare Zustände: Laden → `KI ist bereit ✓` oder `KI nicht verfügbar`
- bei einem Startfehler wird eine technische Fehlermeldung lokal angezeigt; sie enthält keine HEB-Eingabe
- kein regel-/regexbasierter Ersatzmodus für HEB-Ausgaben
- lokaler Datenschutzfilter vor jeder Formulierung
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank
- keine zentrale Fallhistorie und kein Login in Version 1

### Ergebnis der bisherigen iPhone-Gerätetests

Der Modelldownload konnte auf dem getesteten iPhone vollständig bis 100 % laufen, anschließend schlug der eigentliche Start des WebGPU-Modells fehl. Das bedeutet: 100 % Download ist nicht gleichbedeutend mit einer einsatzbereiten KI.

Als konkrete technische Ursache wurde identifiziert, dass die App Transformers.js 4.2.0 verwendet. Diese Version erschien am 23. April 2026. Die spezielle Safari-26-WebGPU-Korrektur wurde im Transformers.js-Projekt erst am 8. Juni 2026 gemergt und ist deshalb nicht Bestandteil von 4.2.0. HEB-Assist setzt die entsprechende Asyncify-Konfiguration für Safari 26+ nun selbst. Ob zusätzlich eine iOS-Speichergrenze oder ein weiterer WebGPU-Fehler auftritt, muss auf dem echten Gerät erneut geprüft werden.

## Aktuell implementiert

- mobile Oberfläche für iPhone, Android und Desktop
- Auswahl HEB A / B / C
- die fünf offiziellen HEB-Bereiche
- ein einziges Eingabefeld in Alltagssprache
- ein einziger Button für den vollständigen HEB-Entwurf
- automatische Struktur passend zu A, B oder C
- sichtbarer Status des lokalen Sprachmodells
- automatisches Laden und Starten des Sprachmodells
- HEB-Eingabe erst nach erfolgreichem KI-Start
- technische Fehleranzeige und manueller Neustart der KI
- lokaler Datenschutzfilter für typische direkte Identifikatoren
- automatische PWA-Update-Erkennung und sichere Übernahme neuer Versionen
- PWA-Manifest und Offline-App-Shell
- Kopierfunktion

## Entwicklungsworkflow

Solange HEB-Assist ausdrücklich als Test-/Entwicklungsprojekt geführt wird, darf direkt auf `main` gearbeitet werden. Vor einer späteren Produktivfreigabe wird der strengere Branch-/PR-Workflow wieder eingeführt. Die verbindlichen Regeln stehen in `PROJECT_RULES.md`.

## Aktueller Status

Bootstrap/Prototyp. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.**

Die feste Testseite wird über GitHub Pages aus `main` veröffentlicht.
