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

## Aktuelle Generierungsarchitektur: v8 Quellenrouting + lokale KI

Die realen iPhone-Tests haben gezeigt, dass ein 1B-Modell bei freier deutscher HEB-Generierung nicht zuverlässig genug ist. Die vorherige v7-Architektur war zwar strenger, ließ das kleine Modell aber jeden HEB-Unterpunkt aus dem gesamten Quellenpaket selbst erkennen und danach nochmals mit demselben Modell verifizieren. Im realen Test führte das zu falschem `keine ausreichenden Angaben` und unnötigen Verwerfungen.

v8 trennt deshalb Auswahl und Formulierung:

1. Die Eingabe wird lokal in unveränderte Originalaussagen zerlegt.
2. Eine rein lokale Routing-Schicht wählt für jeden offiziellen HEB-Unterpunkt nur passende Originalaussagen aus.
3. Diese Routing-Schicht **erzeugt keinen HEB-Text** und ist kein Ersatzmodus.
4. Erst das vollständig gestartete lokale Sprachmodell formuliert aus dem verkleinerten Quellenpaket einen kurzen HEB-Abschnitt.
5. Die KI-Ausgabe wird anschließend lokal gegen die ausgewählten Originalaussagen geprüft.
6. Harte Sperren blockieren u. a. erfundene Ursachen, Bewertungen, fremde Themen, neue Zahlen, veränderten Unterstützungsumfang, kaputte Zeichensetzung und bekannte degenerierte Fehlmuster.
7. Besteht der erste KI-Entwurf die Sicherheitsprüfung nicht, gibt es höchstens einen zweiten, ausdrücklich quellen-nahen KI-Versuch.
8. Fällt auch dieser Versuch durch, wird nur der betroffene HEB-Unterpunkt als nicht sicher formulierbar gekennzeichnet. Es erscheint kein regel-/regexbasierter Ersatztext als vermeintliche KI-Ausgabe.
9. Fehlen tatsächlich Informationen – z. B. ein Ziel, eine Entwicklung oder ein Anbieter – wird dies transparent kenntlich gemacht statt ergänzt.

Die Routing-Schicht dient ausschließlich dazu, die Aufgabe für das kleine lokale Modell zu verkleinern. Die sichtbare HEB-Prosa stammt weiterhin nur aus dem vollständig gestarteten lokalen Sprachmodell.

## Automatische Regressionstests

Vor jedem GitHub-Pages-Deploy werden ausgeführt:

- JavaScript-Syntaxprüfungen
- synthetische Quellen- und Routing-Regressionstests
- Browser-Smoke-Tests in Desktop Chromium und Desktop WebKit
- Android-ähnlicher Chromium-Viewport
- iPhone-ähnlicher WebKit-Viewport
- Prüfung von HEB A/B/C und den fünf offiziellen Bereichen
- Prüfung der Eingabesperre ohne gestartete KI
- Dark-Mode-Prüfung
- Prüfung auf mobile Viewport-Überläufe
- Manifest- und Service-Worker-Prüfung

Die Regressionstests decken insbesondere bekannte Fehler ab:

- erfundene Ursache wie „Ermüdung“
- Verschiebung von Unterstützung beim Beginn hin zu Unterstützung bei der Durchführung
- Vermischung verschiedener Originalaussagen
- wertende Formulierungen wie „gute Idee“
- degenerierte Zeichensetzung und kaputte KI-Ausgaben
- korrektes Routing eines verbalen Impulses zum Hilfebedarf
- kein erfundenes Ziel ohne ausdrückliche Zielangabe
- keine automatische Maßnahme aus einem bloß genannten Unterstützungsbedarf

Ein fehlgeschlagener relevanter Test verhindert den Deploy.

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
- v7 war zu streng bzw. verließ sich zu stark auf dasselbe kleine Modell für Erkennung und Gegenprüfung; dadurch wurden vorhandene Angaben fälschlich nicht erkannt oder verworfen

Daraus folgt: Der aktuelle Schwerpunkt liegt auf kleiner, klarer KI-Aufgabe, Quellenbindung und nachprüfbarer Sicherheitslogik statt auf freier HEB-Generierung.

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
- automatischer Dark Mode entsprechend dem Systemmodus
- Kopierfunktion
- v8 Quellenrouting + lokale KI-Formulierung + lokale Sicherheitsprüfung

## Entwicklungsworkflow

Solange HEB-Assist ausdrücklich als Test-/Entwicklungsprojekt geführt wird, darf direkt auf `main` gearbeitet werden. Vor einer späteren Produktivfreigabe wird der strengere Branch-/PR-Workflow wieder eingeführt. Die verbindlichen Regeln stehen in `PROJECT_RULES.md`.

GitHub ist die verbindliche technische Quelle. Änderungen gelten erst als veröffentlicht, wenn der zugehörige GitHub-Actions-Lauf erfolgreich war und GitHub Pages tatsächlich deployed wurde. Der tatsächliche Prüfstand wird in `TEST_STATUS.md` gepflegt.

## Aktueller Status

Prototyp / Qualitätstest. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.**

Die feste Testseite wird über GitHub Pages aus `main` veröffentlicht.
