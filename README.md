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
- lokales Sprachmodell: Gemma 3 270M Instruct, Q8_0
- lokale Laufzeit: `gemma-webgpu` 0.1.0 über reines WebGPU
- das Modell wird speicherschonend per HTTP-Range-Requests in Abschnitten geladen und direkt in GPU-Speicher übertragen; dadurch muss nicht die komplette Modelldatei gleichzeitig als JavaScript-/WASM-Speicher gehalten werden
- Kontextlänge im aktuellen mobilen Testprofil: 1024 Tokens
- das Eingabefeld bleibt bis zum vollständigen Modellstart gesperrt
- klare Zustände: Laden → `KI ist bereit ✓` oder `KI nicht verfügbar`
- bei einem Startfehler wird eine technische Fehlermeldung lokal angezeigt; sie enthält keine HEB-Eingabe
- kein regel-/regexbasierter Ersatzmodus für HEB-Ausgaben
- lokaler Datenschutzfilter vor jeder Formulierung
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank
- keine zentrale Fallhistorie und kein Login in Version 1

### Externe Netzwerkzugriffe

Beim Laden der App bzw. des lokalen Modells werden ausschließlich statische Ressourcen abgerufen:

- GitHub Pages: App-Dateien
- jsDelivr: `gemma-webgpu`-Laufzeitbibliothek
- Hugging Face: Gemma-Modellgewichte über HTTP-Range-Requests

Die HEB-Eingabe wird nicht an diese Dienste zur Inferenz gesendet. Die eigentliche Textgenerierung läuft im Browser auf dem Endgerät. Normale Verbindungsmetadaten eines Downloads, z. B. IP-Adresse und Browserinformationen, können bei den jeweiligen Infrastrukturbetreibern technisch anfallen.

## Ergebnis der bisherigen iPhone-Gerätetests

Die bisherigen Transformers.js-/ONNX-Runtime-Varianten konnten das Modell zwar laden, Safari wurde jedoch bei der eigentlichen autoregressiven Textgenerierung wiederholt vom Betriebssystem beendet. Das trat sowohl mit WebGPU als auch mit einem WASM-Versuch auf.

Deshalb wird dieser ONNX-Pfad für iPhone/iPad nicht weiterverfolgt. Der aktuelle Testpfad verwendet stattdessen `gemma-webgpu`, dessen Gewichte schichtweise geladen werden und dessen Entwickler einen realen iPhone-17-Pro-Max-Test unter Safari/iOS 26 dokumentiert haben. Dieser neue Pfad muss auf dem realen Zielgerät noch mit HEB-Generierung verifiziert werden.

## Aktuell implementiert

- mobile Oberfläche für iPhone, Android und Desktop
- Auswahl HEB A / B / C
- die fünf offiziellen HEB-Bereiche
- ein einziges Eingabefeld in Alltagssprache
- ein einziger Button für den vollständigen HEB-Entwurf
- automatische Struktur passend zu A, B oder C
- sichtbarer Status des lokalen Sprachmodells
- vollständiger Ladebildschirm bis zur einsatzbereiten KI
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
