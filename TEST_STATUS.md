# HEB-Assist – Teststatus

Stand: 2026-09-05

## Bereits geprüft

- JavaScript-Grundstruktur, Datenschutzfilter und App-Steuerung wurden im Entwicklungsverlauf geprüft.
- Datenschutzfilter mit vollständig synthetischen Beispielen geprüft:
  - normale HEB-Beschreibung: kein Treffer
  - E-Mail-Adresse: erkannt
  - Telefonnummer: erkannt
  - konkretes Datum: erkannt
  - Straßenadresse: erkannt
  - Postleitzahl: erkannt
  - Personenname nach Anrede: erkannt
  - typische Versicherungsnummer: erkannt
- GitHub-Pages-Testseite ist erreichbar.
- Reale Darstellung auf einem iPhone wurde geprüft.
- HEB A / B / C und die fünf offiziellen HEB-Bereiche wurden anhand der bereitgestellten bayerischen HEB-Bögen abgeglichen.
- Die App-Shell aktualisiert sich automatisch über GitHub Pages / Service Worker.
- Die eigentliche HEB-Eingabe bleibt bis zum vollständigen Start der lokalen KI gesperrt.

## Ergebnis der bisherigen iPhone-KI-Tests

### Transformers.js / ONNX Runtime

- Das ursprüngliche Qwen2.5-0.5B-Modell konnte bis 100 % heruntergeladen werden.
- Safari scheiterte anschließend beim Modellstart bzw. wurde bei der Inferenz beendet.
- Ein kleineres Gemma-3-270M-ONNX-Modell konnte geladen und als „bereit“ gemeldet werden.
- Beim Druck auf „HEB-Entwurf erstellen“ wurde der Safari-Webseitenprozess dennoch wiederholt beendet.
- Ein zusätzlicher iPhone-WASM-Versuch mit einem Thread verhinderte den Absturz ebenfalls nicht.

Ergebnis: Der Transformers.js-/ONNX-Pfad ist auf dem getesteten iPhone für die eigentliche Textgenerierung nicht zuverlässig genug und wird dort nicht weiterverfolgt.

### gemma-webgpu 270M

- `gemma-webgpu` 0.1.0 mit Gemma 3 270M Q8_0 konnte auf dem realen iPhone vollständig geladen werden.
- Die Textgenerierung lief durch, ohne den Safari-Webseitenprozess zu beenden.
- Der erzeugte HEB-Text war jedoch fachlich unbrauchbar: starke Wiederholungsschleifen wie „Behandlungs-Körperpflege“ statt einer nachvollziehbaren HEB-Formulierung.

Ergebnis: Die neue Laufzeit ist auf dem getesteten Gerät deutlich stabiler, das 270M-Modell ist für die gewünschte professionelle deutsche HEB-Formulierung aber nicht ausreichend.

## Aktueller Teststand

HEB-Assist verwendet jetzt `gemma-webgpu` 0.1.0 mit **Gemma 3 1B Q8_0**.

Zusätzliche Qualitätsmaßnahmen:

- stärkere 1B-Modellvariante statt 270M
- weiterhin speicherschonendes Range-Request-Laden direkt in GPU-Speicher
- Kontextlänge auf 1024 Tokens begrenzt
- vollständiger HEB-Bereich wird nicht mehr in einem einzigen langen Modellaufruf erzeugt
- jeder offizielle HEB-Unterpunkt wird einzeln mit kurzem, gezieltem Prompt formuliert und anschließend in der App zusammengesetzt
- Wiederholungsstrafe wurde erhöht
- automatische Erkennung von Wiederholungsschleifen / degenerierter Ausgabe
- bei erneut unbrauchbarer Ausgabe wird der Text verworfen statt als HEB-Entwurf angezeigt

## Noch nicht geprüft / keine Freigabe

- Gemma-3-1B-Pfad noch nicht mit dem synthetischen HEB-A-Testfall auf dem realen iPhone bestätigt
- fachliche Qualität der neuen HEB-A-Ausgabe noch nicht bewertet
- HEB B noch nicht mit synthetischem Verlaufsfall bewertet
- HEB C noch nicht mit synthetischem Abschlussfall bewertet
- kein realer Android-Test
- kein systematischer Desktop-Test
- keine produktive Freigabe für echte Falldaten

## Freigaberegel

Bis die offenen Punkte geprüft sind, darf HEB-Assist ausschließlich mit vollständig synthetischen Testfällen verwendet werden.
