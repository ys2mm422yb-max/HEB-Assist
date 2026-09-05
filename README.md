# HEB-Assist

HEB-Assist ist eine eigenständige, mobile Web-App/PWA zur Unterstützung bei fachlichen Formulierungen für HEB-Dokumentation im sozialpsychiatrischen Bereich.

## Ziel

Mitarbeitende beschreiben eine Situation in normaler Alltagssprache. HEB-Assist erzeugt daraus einen fachlich nachvollziehbaren, wertschätzenden und ressourcenorientierten Formulierungsvorschlag, ohne neue Tatsachen hinzuzuerfinden.

## Verbindliche Grundprinzipien

- **Eigenständiges Projekt:** keine technische, inhaltliche oder datenbezogene Verbindung zu anderen Projekten.
- **Mobile first:** iPhone, Android und Desktop werden als Zielplattformen berücksichtigt.
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
- automatisch aktualisierende App-Shell über GitHub Pages
- lokales Sprachmodell im aktuellen iPhone-Test: **Llama 3.2 1B Instruct q4f16**
- lokale Laufzeit: **WebLLM 0.2.82** über WebGPU
- Kontextfenster im mobilen Testprofil: 2048 Tokens
- Modell-Cache über die Browser Cache API; der Browser bzw. iOS kann diesen Speicher unter Umständen trotzdem entfernen
- das Eingabefeld bleibt bis zum vollständigen Modellstart gesperrt
- klare Zustände: Laden → `KI ist bereit ✓` oder `KI nicht verfügbar`
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank
- keine zentrale Fallhistorie und kein Login in Version 1

## Neue Generierungsarchitektur: Quellen statt freier Fantasie

Die bisherigen iPhone-Tests haben gezeigt, dass ein 1B-Modell bei freier deutscher HEB-Generierung sprachlich und fachlich unzuverlässig sein kann. Deshalb erzeugt HEB-Assist einen vollständigen HEB-Bereich nicht mehr direkt aus dem gesamten Falltext.

Der aktuelle Ablauf ist zweistufig und quellengebunden:

1. Die Eingabe wird lokal in Originalaussagen mit IDs wie `S1`, `S2`, `S3` zerlegt.
2. Das vollständig gestartete lokale Sprachmodell ordnet ausschließlich diese vorhandenen Quellen-IDs den offiziellen HEB-Unterpunkten zu.
3. Die Anwendung akzeptiert nur IDs, die tatsächlich in der Eingabe existieren.
4. Jeder HEB-Unterpunkt wird anschließend vom selben lokalen Sprachmodell ausschließlich aus den dafür freigegebenen Originalbelegen formuliert.
5. Eine zusätzliche lokale Qualitätsprüfung kontrolliert unter anderem:
   - nicht belegte Ursachen
   - wertende Formulierungen
   - Fantasiewörter und degenerierte Bindestrichketten
   - auffällige Zeichensetzung / Wiederholungsmuster
   - neu eingeführte Zahlen
   - zu viele nicht durch die Originalbelege verankerte Inhaltswörter
   - unvollständige oder zu lange Sätze
6. Fällt die Ausgabe durch die Prüfung, wird sie verworfen. Es erscheint **kein** regel- oder regexbasierter Ersatztext als vermeintliche KI-Ausgabe.

Zusätzlich gelten fachliche Sperren: Eine bloße Situationsbeschreibung wird nicht automatisch zu einem Ziel. Bei HEB B/C darf ohne tatsächlichen zeitlichen Vergleich keine Entwicklung erfunden werden.

## Externe Netzwerkzugriffe

Beim Laden der App bzw. des lokalen Modells werden statische Ressourcen abgerufen:

- GitHub Pages: App-Dateien
- `esm.run`: WebLLM-Laufzeitbibliothek
- die von WebLLM referenzierten Modellressourcen für das lokale Sprachmodell

Die HEB-Eingabe wird nicht an einen externen KI-Inferenzdienst geschickt. Die eigentliche Modellverarbeitung läuft im Browser auf dem Endgerät. Bei gewöhnlichen Dateiabrufen können technisch übliche Verbindungsmetadaten wie IP-Adresse oder Browserinformationen beim jeweiligen Infrastrukturbetreiber anfallen.

## Ergebnis der bisherigen iPhone-Gerätetests

Die bisherigen Tests haben mehrere Grenzen sichtbar gemacht:

- größere lokale Modelle führten auf dem getesteten iPhone/Safari teils zu Speicher- bzw. Webseitenprozess-Abbrüchen
- sehr kleine Modelle waren stabiler, lieferten aber fachlich unbrauchbare deutsche Texte
- Llama 3.2 1B läuft auf dem Gerät stabiler als größere getestete Varianten, erzeugte im freien Generierungsmodus jedoch weiterhin erfundene oder sprachlich fehlerhafte Inhalte

Daraus folgt: Der aktuelle Schwerpunkt liegt nicht auf noch mehr Prompt-Tuning, sondern auf der quellengebundenen Zwei-Stufen-Architektur mit harter Verifikation.

## Aktuell implementiert

- mobile Oberfläche für iPhone, Android und Desktop
- Auswahl HEB A / B / C
- die fünf offiziellen HEB-Bereiche
- ein einziges Eingabefeld in Alltagssprache
- ein einziger Button für den vollständigen HEB-Entwurf
- automatische Struktur passend zu A, B oder C
- sichtbarer Status des lokalen Sprachmodells
- vollständiger Ladebildschirm bis zur einsatzbereiten KI
- lokaler Datenschutzfilter für typische direkte Identifikatoren
- automatische PWA-Update-Erkennung und sichere Übernahme neuer Versionen
- PWA-Manifest und Offline-App-Shell
- Kopierfunktion
- quellengebundene KI-Analyse und lokale Qualitätsprüfung

## Entwicklungsworkflow

Solange HEB-Assist ausdrücklich als Test-/Entwicklungsprojekt geführt wird, darf direkt auf `main` gearbeitet werden. Vor einer späteren Produktivfreigabe wird der strengere Branch-/PR-Workflow wieder eingeführt. Die verbindlichen Regeln stehen in `PROJECT_RULES.md`.

## Aktueller Status

Prototyp / Qualitätstest. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.**

Die feste Testseite wird über GitHub Pages aus `main` veröffentlicht.
