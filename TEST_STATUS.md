# HEB-Assist – Teststatus

Stand: 2026-09-06

## Verbindlicher Teststatus

HEB-Assist ist weiterhin ein Test-/Entwicklungsprojekt. Bis zur fachlichen Freigabe dürfen ausschließlich vollständig synthetische Testfälle verwendet werden.

## Bereits geprüft

- Datenschutzfilter mit vollständig synthetischen Beispielen: normale HEB-Beschreibung ohne Treffer; E-Mail, Telefonnummer, konkretes Datum, Straßenadresse, Postleitzahl, Personenname nach Anrede und typische Versicherungsnummer werden erkannt.
- GitHub-Pages-Testseite ist grundsätzlich erreichbar.
- Reale Darstellung auf einem iPhone wurde mehrfach geprüft.
- HEB A / B / C und die fünf offiziellen HEB-Hauptbereiche wurden anhand der bereitgestellten Bayerischer-Bezirketag-Bögen abgeglichen.
- HEB-Eingaben bleiben gesperrt, bis das echte lokale Sprachmodell vollständig gestartet ist.
- Kein externer KI-Inferenzserver und kein regel-/regexbasierter Ersatz-HEB.
- Automatischer Dark Mode über `prefers-color-scheme` ist implementiert.
- Automatische PWA-Aktualisierung über GitHub Pages / Service Worker ist implementiert.

## Bisherige Modelltests auf iPhone/Safari

### Größere Modelle

- Größere lokale Modellvarianten konnten teilweise geladen werden, führten auf dem getesteten iPhone aber beim Start oder bei der Generierung zu Webseitenprozess-/Speicherproblemen.
- Ein Qwen-2.5-1.5B-WebLLM-Versuch war für die praktische iOS-Speichergrenze zu schwer.

### Sehr kleine Modelle

- Gemma 3 270M lief stabiler, erzeugte aber fachlich unbrauchbare Wiederholungen und Fantasiewörter.
- Llama 3.2 1B Instruct läuft stabiler als die größeren getesteten Varianten, ist bei freier HEB-Generierung aber nicht zuverlässig genug.
- Frühere freie Ausgaben enthielten u. a. erfundene Ursachen, Wertungen, ungrammatische Formulierungen und Bedeutungsverschiebungen des Hilfebedarfs.

## Letzter realer iPhone-Test von v7

Der bekannte vollständig synthetische HEB-A-Testfall wurde erneut geprüft. Ergebnis:

- a) „Aktuelle Situation …“ wurde als nicht sicher formulierbar verworfen.
- b) „Einschätzung des Hilfebedarfs“ meldete fälschlich keine ausreichenden Angaben, obwohl ein verbaler Impuls zur Initiierung ausdrücklich beschrieben war.
- c) „Rahmenziele“ meldete korrekt keine ausreichenden Angaben, weil kein Ziel genannt war.
- d) „Geplante Maßnahmen“ wurde als nicht sicher formulierbar verworfen, obwohl konkrete Erinnerungs-/Angebotshandlungen beschrieben waren.

Bewertung: **v7 ist fachlich/praktisch nicht ausreichend und wird nicht weiterverwendet.**

## Aktueller Entwicklungsstand: v8

HEB-Assist verwendet weiterhin **Llama 3.2 1B Instruct q4f16 über WebLLM 0.2.82** mit 2048 Tokens Kontext. Die Generierungsarchitektur wurde auf **v8** umgestellt.

### Quellenrouting + lokale KI

1. Die Eingabe wird lokal in unveränderte Originalaussagen zerlegt.
2. Eine lokale Routing-Schicht wählt für jeden offiziellen HEB-Unterpunkt nur passende Originalaussagen aus.
3. Diese Routing-Schicht erzeugt **keinen HEB-Text** und ist kein Ersatzmodus.
4. Erst die vollständig gestartete lokale KI formuliert aus dem verkleinerten Quellenpaket einen kurzen HEB-Abschnitt.
5. Eine harte lokale Sicherheitsprüfung verwirft u. a. erfundene Ursachen, Bewertungen, fremde Themen, neue Zahlen, veränderten Unterstützungsumfang, kaputte Zeichensetzung und bekannte degenerierte Fehlmuster.
6. Besteht der erste KI-Entwurf diese Prüfung nicht, gibt es höchstens einen zweiten, ausdrücklich quellen-nahen KI-Versuch.
7. Es gibt keinen zweiten 1B-KI-Verifizierer mehr, weil dieser in v7 fachlich korrekte Inhalte zu häufig fälschlich verworfen hat.
8. Fehlen tatsächlich Angaben, wird dies transparent gekennzeichnet; es werden keine Ziele, Entwicklungen, Hilfebedarfsstufen oder Anbieter erfunden.

### Erwartung für den bekannten synthetischen HEB-A-Testfall

- a) muss aktuelle Situation und vorhandene Selbstständigkeit abbilden.
- b) muss den Unterstützungsbedarf bei der **Initiierung** der Körperpflege erkennen; Unterstützung bei der Durchführung darf nicht erfunden werden.
- c) muss ohne genanntes Ziel „keine ausreichenden Angaben“ ausgeben.
- d) darf nur die tatsächlich beschriebenen Unterstützungs-Handlungen wie verbaler Impuls, Erinnerung und erneutes Angebot verwenden.

## Automatisierte Tests

Der GitHub-Pages-Workflow prüft vor dem Deploy:

- JavaScript-Syntax der App-Dateien einschließlich `evidence-router.js`
- synthetische Quellen- und Routing-Regressionstests
- Browser-Smoke-Tests mit Playwright in Desktop Chromium, Desktop WebKit, Android-ähnlichem Chromium und iPhone-ähnlichem WebKit
- HEB A/B/C und alle fünf offiziellen Hauptbereiche
- Sperre ohne gestartete echte KI
- keine rohen englischen Modellmeldungen in der Oberfläche
- Dark Mode
- mobile Viewport-Überläufe
- Manifest und Service Worker

Ein relevanter fehlgeschlagener Test verhindert den GitHub-Pages-Deploy.

## Zuletzt bestätigter veröffentlichter Stand vor v8

- 16 von 16 Browser-Smoke-Tests bestanden.
- Der frühere horizontale iPhone/WebKit-Overflow trat nach dem CSS-Fix nicht mehr auf.
- GitHub Pages wurde erfolgreich veröffentlicht.

## v8 noch offen

- aktueller GitHub-Actions-Lauf für v8 muss vollständig grün sein
- v8 muss anschließend mit dem bekannten synthetischen HEB-A-Testfall auf dem realen iPhone geprüft werden
- fachliche Qualität der v8-Ausgabe muss bewertet werden
- mehrere aufeinanderfolgende Generierungen auf echtem iPhone noch nicht geprüft
- Dark Mode auf realem iPhone noch nicht abschließend visuell geprüft
- HEB B noch nicht mit synthetischem Verlaufsfall bewertet
- HEB C noch nicht mit synthetischem Abschlussfall bewertet
- kein realer Android-Gerätetest der vollständigen WebGPU-KI-Generierung
- kein realer Desktop-WebGPU-Test der vollständigen lokalen KI-Generierung
- keine produktive Freigabe für echte Falldaten

## Freigaberegel

Bis die offenen Punkte geprüft sind, darf HEB-Assist ausschließlich mit vollständig synthetischen Testfällen verwendet werden.
