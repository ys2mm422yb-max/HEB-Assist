# HEB-Assist – Teststatus

Stand: 2026-09-05

## Bereits geprüft

- Feature-Branch ist gegenüber `main` nur voraus und nicht dahinter.
- JavaScript-Syntax von Datenschutzfilter, KI-Engine und App-Steuerung wurde lokal mit Node geprüft.
- Datenschutzfilter mit fiktiven Beispielen geprüft:
  - normale HEB-Beschreibung: kein Treffer
  - E-Mail-Adresse: erkannt
  - Telefonnummer: erkannt
  - konkretes Datum: erkannt
  - Straßenadresse: erkannt
  - Postleitzahl: erkannt
  - Personenname nach Anrede: erkannt
  - typische Versicherungsnummer: erkannt
- Öffentliche Netlify-Testseite ist erreichbar.
- Reale Darstellung auf einem iPhone wurde geprüft.
- HEB A / B / C und die fünf offiziellen HEB-Bereiche wurden anhand der bereitgestellten bayerischen HEB-Bögen abgeglichen.

## Ergebnis des ersten lokalen KI-Tests auf iPhone

- WebGPU wurde vom Browser grundsätzlich erkannt.
- Der Download des Qwen2.5-0.5B-Instruct-Modells startete.
- Der Modelldownload / Modellstart dauerte mehrere Minuten.
- Der Start brach auf dem getesteten iPhone anschließend ab.
- Ergebnis: Dieser große lokale Modellpfad ist für die mobile Grundfunktion derzeit **nicht praxistauglich** und darf die normale Nutzung nicht blockieren.

## Aktuelle Gegenmaßnahme

- Die verwirrende Auswahl einzelner HEB-Unterpunkte wurde entfernt.
- Normaler Workflow: HEB-Bogen wählen → HEB-Bereich wählen → Situation frei beschreiben → ein Button → vollständiger Entwurf.
- Der Standardpfad verwendet einen sofortigen lokalen Schnellmodus ohne großen Modelldownload.
- Das große lokale Sprachmodell bleibt nur ein separates Experiment und ist nicht Voraussetzung für die Nutzung.
- PWA-Cache wurde auf `heb-assist-shell-v3` erhöht, damit Zielgeräte die neue Oberfläche laden.

## Noch nicht geprüft / keine Freigabe

- neuer Schnellmodus noch nicht auf dem realen iPhone gegengeprüft
- kein realer Android-Test
- noch keine systematische fachliche Qualitätsbewertung mit mehreren fiktiven HEB-Fällen
- noch keine produktive Freigabe für echte Falldaten

## Freigaberegel

Bis die offenen Punkte geprüft sind, darf HEB-Assist ausschließlich mit vollständig fiktiven Testfällen verwendet werden.
