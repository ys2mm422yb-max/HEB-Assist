# HEB-Assist

HEB-Assist ist eine eigenständige, mobile Web-App/PWA zur Unterstützung bei fachlichen HEB-Formulierungen in der sozialpsychiatrischen Eingliederungshilfe.

## Ziel

Mitarbeitende wählen HEB A, B oder C, den offiziellen HEB-Bereich und beschreiben die Situation in eigenen Worten. HEB-Assist soll daraus einen fachlich nachvollziehbaren, neutralen und ressourcenorientierten Formulierungsvorschlag erzeugen, ohne nicht genannte Tatsachen zu erfinden.

## Verbindliche Grundprinzipien

- **Eigenständiges Projekt:** keine technische, inhaltliche oder datenbezogene Verbindung zu anderen Projekten.
- **Mobile first:** iPhone/iOS ist ein besonders wichtiges Testgerät; Android und Desktop werden ebenfalls berücksichtigt.
- **Lokale KI:** Falltext wird nicht an einen externen KI-Inferenzserver geschickt.
- **Kein versteckter Ersatzmodus:** HEB-Texte werden nur mit vollständig gestarteter echter lokaler KI erzeugt. Regeln dürfen prüfen, aber keinen vermeintlichen KI-HEB formulieren.
- **Keine erfundenen Tatsachen:** keine frei ergänzten Diagnosen, Symptome, Ursachen, Fähigkeiten, Ressourcen, Entwicklungen, Ziele, Maßnahmen, Hilfebedarfe, Hilfebedarfsstufen oder Anbieter.
- **Fachliche Trennung:** Beobachtung, Selbstaussage und fachliche Einschätzung nicht vermischen.
- **Datensparsamkeit:** keine zentrale Fallhistorie, keine Cloud-Datenbank und kein Login in Version 1.
- **Identifizierende Daten blockieren:** typische direkte Identifikatoren werden lokal geprüft; der Filter ist keine Garantie vollständiger Anonymität.
- **Menschliche Verantwortung:** jeder Entwurf muss vor Übernahme fachlich geprüft werden.
- **Automatische Updates:** veröffentlichte App-Versionen werden automatisch erkannt und übernommen, ohne dass Nutzer normalerweise Cache löschen oder die PWA neu installieren müssen.

## Fachliche Grundlage

HEB-Assist orientiert sich an den offiziellen bayerischen HEB-Bögen für Menschen mit einer wesentlichen seelischen Behinderung:

- HEB A – Vorläufige Hilfeplanung
- HEB B – Entwicklungsbericht
- HEB C – Abschlussbericht

Die fünf offiziellen HEB-Bereiche werden unverändert als Hauptbereiche verwendet. Die genaue Struktur steht in `HEB_REFERENCE.md`.

## Technik – v10

- statische HTML/CSS/JavaScript-PWA ohne Backend
- GitHub Pages als Test-Web-App
- lokale Laufzeit: **WebLLM 0.2.82 / WebGPU**
- lokales Modell: **Qwen 3 1.7B q4f16**
- mobiles Kontextfenster: 2048 Tokens, Prefill-Chunk 128
- die WebLLM-JavaScript-Laufzeit wird beim Deploy mit HEB-Assist gebündelt und von GitHub Pages ausgeliefert; es wird keine externe JavaScript-CDN für die KI-Laufzeit benötigt
- das Modell wird beim ersten Start geladen und von WebLLM lokal im Browser gespeichert
- nach erfolgreichem Erstdownload kann die Inferenz ohne externen KI-Inferenzserver lokal erfolgen; echter Offlinebetrieb hängt davon ab, dass Browser/PWA-Cache und Modellspeicher vom Betriebssystem nicht entfernt werden
- Eingabe bleibt bis zum vollständigen Modellstart gesperrt
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank

## v10: stärkeres Modell und nur ein intelligenter Gesamt-Lauf

Die realen iPhone-Tests der kleineren Modelle waren fachlich nicht ausreichend. Qwen 3 0.6B konnte die gewünschte HEB-Synthese nicht zuverlässig auf dem erforderlichen Niveau leisten. Außerdem war die vorherige Analyse-plus-Reviewer-Pipeline langsam und vermittelte während der Generierung zu wenig Rückmeldung.

v10 ändert deshalb den Kern:

1. **Qwen 3 1.7B** erhält die vollständige Situation, den HEB-Bogen, den gewählten offiziellen Bereich und alle zugehörigen Unterpunkte gemeinsam.
2. Das Modell arbeitet in **einem einzigen Thinking-/Reasoning-Lauf**. Es soll Zusammenhänge fachlich erfassen und nicht bloß Sätze kopieren.
3. Die Eingabe wird nur zur Nachvollziehbarkeit in Originalaussagen mit Beleg-IDs zerlegt. Diese Belege steuern nicht regelbasiert, was die KI denken oder formulieren darf.
4. Jeder ausgegebene Unterpunkt muss die verwendeten Originalbelege nennen.
5. Danach erfolgt **keine zweite KI-Überarbeitung**. Eine lokale Sicherheitsprüfung blockiert nur klar unzulässige Ergebnisse; sie schreibt selbst keinen HEB-Text.
6. Die Generierung läuft als Stream. Die Oberfläche zeigt einen bewegten Aktivitätsbalken, Bearbeitungszeit und den aktuellen Schritt („analysiert“ / „formuliert“), damit ein laufender Prozess von einem Hänger unterscheidbar ist.
7. Nach drei Minuten wird eine festhängende Generierung abgebrochen. Es wird kein Ersatztext erzeugt.
8. HEB-Texte bleiben bewusst kurz, damit sie näher an die begrenzten Textfelder der offiziellen Bögen passen.

### Fachliche Leitplanken

- Ein verbaler Impuls zum Beginn einer Tätigkeit ist Hilfebedarf bei der **Initiierung**, nicht automatisch bei der Durchführung.
- Vorhandene Selbstständigkeit bleibt als Ressource erhalten.
- Ziele nur bei ausdrücklich genanntem Ziel oder Wunsch.
- HEB B/C: Entwicklung nur bei tatsächlich beschriebenem zeitlichem Verlauf.
- Eine formale Hilfebedarfsstufe wird nicht automatisch gewählt.
- Für HEB A darf eine konkret beschriebene laufende Unterstützung als dieselbe Maßnahme benannt werden; zusätzliche oder intensivere Maßnahmen dürfen nicht ergänzt werden.

## Offline-Architektur

Die JavaScript-KI-Laufzeit wird aus dem npm-Paket `@mlc-ai/web-llm` beim GitHub-Actions-Deploy lokal gebündelt (`vendor/webllm.js`) und mit der PWA gecacht. Dadurch braucht HEB-Assist nach einem vollständig erfolgreichen Erststart keine externe JavaScript-CDN für die KI-Laufzeit.

Die Modellgewichte und die für das Modell benötigten WebGPU-Ressourcen werden beim ersten Modellstart durch WebLLM geladen und lokal im Browsercache gespeichert. Ob diese Daten dauerhaft erhalten bleiben, entscheidet der Browser bzw. iOS/Android; eine Garantie gegen Speicherbereinigung ist technisch nicht möglich.

## Automatische Tests

Vor jedem GitHub-Pages-Deploy werden ausgeführt:

- JavaScript-Syntaxprüfungen
- Build der lokal gebündelten WebLLM-Laufzeit
- synthetische Quellen-/Sicherheits-Regressionstests
- Reasoning-Ausgabeparser-/Sicherheitstests
- Browser-Smoke-Tests in Chromium und WebKit
- Android-ähnlicher Chromium-Viewport
- iPhone-ähnlicher WebKit-Viewport
- HEB A/B/C und die fünf offiziellen Hauptbereiche
- Eingabesperre ohne gestartete echte KI
- Dark Mode und mobile Viewport-Überläufe
- Manifest, Service Worker und lokal ausgelieferte WebLLM-Laufzeit

Ein fehlgeschlagener relevanter Test verhindert den Deploy. Diese Tests können keine echte iPhone-WebGPU-Inferenz und keine reale Modellqualität ersetzen.

## Externe Netzwerkzugriffe

Beim ersten Laden werden statische App-Dateien von GitHub Pages und die von WebLLM referenzierten Modellressourcen geladen. Die HEB-Eingabe wird nicht an einen externen KI-Inferenzdienst geschickt. Beim Abruf statischer Dateien können technisch übliche Verbindungsmetadaten wie IP-Adresse oder Browserinformationen beim jeweiligen Infrastrukturbetreiber anfallen.

## Entwicklungsworkflow

Solange HEB-Assist ausdrücklich Test-/Entwicklungsprojekt ist, darf direkt auf `main` gearbeitet werden. GitHub ist die verbindliche technische Quelle. Änderungen gelten erst als veröffentlicht, wenn der zugehörige GitHub-Actions-Lauf erfolgreich war und GitHub Pages tatsächlich deployed wurde. Der reale Prüfstand steht in `TEST_STATUS.md`.

## Aktueller Status

Prototyp / Qualitätstest. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.** Bis zur fachlichen Freigabe ausschließlich vollständig synthetische Testfälle verwenden.
