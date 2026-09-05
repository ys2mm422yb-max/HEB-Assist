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

## Aktuelle Gegenmaßnahme

HEB-Assist verwendet im neuen Teststand `gemma-webgpu` 0.1.0 mit Gemma 3 270M Q8_0.

Der wesentliche Architekturunterschied:

- keine Transformers.js-/ONNX-Runtime für die Generierung
- reines WebGPU
- Modellgewichte werden per HTTP-Range-Requests in Abschnitten geladen
- Abschnitte werden direkt in GPU-Speicher übertragen
- die komplette Modelldatei muss dadurch nicht gleichzeitig als großer JavaScript-/WASM-Speicher vorliegen
- Kontextlänge aktuell auf 1024 Tokens begrenzt
- Ausgabe aktuell auf maximal 240 Tokens begrenzt

Dieser Runtime-Pfad ist laut upstream-Dokumentation auf einem realen iPhone 17 Pro Max mit Safari/iOS 26 getestet worden. Die konkrete HEB-Assist-Integration ist trotzdem erst nach eigenem Gerätetest als bestätigt anzusehen.

## Noch nicht geprüft / keine Freigabe

- neuer `gemma-webgpu`-Pfad noch nicht mit dem synthetischen HEB-A-Testfall auf dem realen iPhone bestätigt
- fachliche Qualität der erzeugten HEB-A-Ausgabe noch nicht bewertet
- HEB B noch nicht mit synthetischem Verlaufsfall bewertet
- HEB C noch nicht mit synthetischem Abschlussfall bewertet
- kein realer Android-Test
- kein systematischer Desktop-Test
- keine produktive Freigabe für echte Falldaten

## Freigaberegel

Bis die offenen Punkte geprüft sind, darf HEB-Assist ausschließlich mit vollständig synthetischen Testfällen verwendet werden.
