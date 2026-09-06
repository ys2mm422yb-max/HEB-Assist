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

## Technik – aktueller Teststand

- statische HTML/CSS/JavaScript-PWA ohne Backend
- GitHub Pages als Test-Web-App
- lokale Laufzeit: **WebLLM 0.2.82** über WebGPU
- aktueller Modelltest: **Qwen 3 0.6B q4f16**
- mobiles Kontextfenster: 2048 Tokens
- Modell wird lokal im Browser gecacht; iOS kann Website-Speicher unter Umständen trotzdem entfernen
- Eingabe bleibt bis zum vollständigen Modellstart gesperrt
- kein Supabase, kein Neon und keine sonstige Cloud-Datenbank

## v9: semantische Gesamtanalyse statt Quellen-Routing

Der reale iPhone-Test von v8 hat gezeigt, dass die bisherige Architektur fachlich nicht ausreicht. Sie wählte Eingabesätze über lokale Regeln aus und ließ ein kleines Modell diese abschnittsweise umformulieren. Dadurch entstanden zwar quellennahe, aber zu mechanische Texte. Im realen Test wurde ein ausdrücklich vorhandener Hilfebedarf sogar zu „Keine Selbstversorgung ist notwendig“ verdreht und der Maßnahmenabschnitt enthielt Meta-Text statt eines fachlichen HEB-Inhalts.

v9 ersetzt diesen Ansatz vollständig:

1. Die Eingabe wird nur für nachvollziehbare Beleg-IDs in unveränderte Originalaussagen zerlegt.
2. Das lokale Sprachmodell erhält **die gesamte Situation** zusammen mit HEB-Bogen, HEB-Bereich und allen offiziellen Unterpunkten.
3. **Qwen 3 läuft für die erste Analyse im Thinking-Modus.** Das Modell soll semantisch unterscheiden, was aktuelle Situation, Ressource, Unterstützungsbedarf, Ziel, Maßnahme oder fehlende Information ist.
4. Die KI muss für jeden sichtbaren Abschnitt die verwendeten Originalaussagen als Beleg-IDs angeben.
5. Anschließend prüft ein zweiter lokaler KI-Lauf den Gesamtentwurf nochmals gegen die vollständige Eingabe und korrigiert fachliche Zuordnung, Widersprüche und Sprache.
6. Lokale Sicherheitslogik prüft danach nur noch harte Grenzen und bekannte Fehler. Sie **schreibt keinen HEB-Text**.
7. Belegte Unterstützung bei der Initiierung darf nicht zu Unterstützung bei der Durchführung werden; vorhandene Selbstständigkeit muss erhalten bleiben.
8. Ziele, Entwicklungen, geplante Maßnahmen, Anbieter oder formale Hilfebedarfsstufen werden nur ausgegeben, wenn die Eingabe sie tatsächlich trägt.
9. Aktuell beschriebene Unterstützung wird nicht stillschweigend zur zukünftigen Planung erklärt. Fehlt die Planung, muss die Ausgabe dies transparent kenntlich machen.
10. Schlägt die fachliche Sicherheitsprüfung fehl, wird der betroffene Abschnitt verworfen statt durch einen regelbasierten Ersatztext ersetzt.

„Thinking“ bedeutet hier einen zusätzlichen lokalen Reasoning-Schritt des Sprachmodells. Es ist keine Behauptung, dass das Modell wie ein Mensch denkt oder automatisch fachlich richtig ist. Die reale Qualität muss weiterhin mit synthetischen Fällen auf den Zielgeräten geprüft werden.

## Warum Qwen 3 0.6B getestet wird

Llama 3.2 1B lief auf dem getesteten iPhone stabiler als größere Modelle, war für die gewünschte freie fachliche HEB-Synthese aber nicht zuverlässig genug. Ein früherer Qwen-2.5-1.5B-Test war auf dem iPhone praktisch zu schwer. Qwen 3 0.6B wird deshalb als neuer Kompromiss getestet: kleiner als die bereits zu schwere 1.5B-Variante, aber mit eigenem Thinking-/Reasoning-Modus und stärkerer semantischer Aufgabenstellung.

Das ist ein Testentscheid, keine Qualitätsgarantie. Wenn Qwen 3 0.6B auf iOS zu viel Speicher benötigt oder fachlich nicht genügt, wird auch dieses Modell verworfen.

## Automatische Tests

Vor jedem GitHub-Pages-Deploy werden ausgeführt:

- JavaScript-Syntaxprüfungen
- synthetische Quellen-/Sicherheits-Regressionstests
- synthetische Tests des neuen Reasoning-Ausgabeparsers
- Browser-Smoke-Tests in Chromium und WebKit
- Android-ähnlicher Chromium-Viewport
- iPhone-ähnlicher WebKit-Viewport
- HEB A/B/C und die fünf offiziellen Hauptbereiche
- Eingabesperre ohne gestartete echte KI
- Dark Mode und mobile Viewport-Überläufe
- Manifest und Service Worker

Ein fehlgeschlagener relevanter Test verhindert den Deploy. Diese Tests können jedoch keine echte iPhone-WebGPU-Inferenz ersetzen.

## Externe Netzwerkzugriffe

Beim Laden der App bzw. des lokalen Modells werden statische Ressourcen abgerufen:

- GitHub Pages: App-Dateien
- `esm.run`: WebLLM-Laufzeitbibliothek
- die von WebLLM referenzierten Modellressourcen

Die HEB-Eingabe wird nicht an einen externen KI-Inferenzdienst geschickt. Beim Abruf statischer Dateien können technisch übliche Verbindungsmetadaten wie IP-Adresse oder Browserinformationen beim jeweiligen Infrastrukturbetreiber anfallen.

## Entwicklungsworkflow

Solange HEB-Assist ausdrücklich Test-/Entwicklungsprojekt ist, darf direkt auf `main` gearbeitet werden. GitHub ist die verbindliche technische Quelle. Änderungen gelten erst als veröffentlicht, wenn der zugehörige GitHub-Actions-Lauf erfolgreich war und GitHub Pages tatsächlich deployed wurde. Der reale Prüfstand steht in `TEST_STATUS.md`.

## Aktueller Status

Prototyp / Qualitätstest. **Nicht für echte Falldaten oder produktive Dokumentation freigegeben.** Bis zur fachlichen Freigabe ausschließlich vollständig synthetische Testfälle verwenden.
