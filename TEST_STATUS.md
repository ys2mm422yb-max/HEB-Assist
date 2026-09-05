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
- Transformers.js 4.2.0 unterstützt die verwendete CDN-ES-Module-Einbindung.
- Qwen2.5-0.5B-Instruct ist als Transformers.js-kompatibles ONNX-Modell verfügbar und unterstützt Deutsch.

## Noch nicht geprüft / keine Freigabe

- kein realer iPhone-Test
- kein realer Android-Test
- kein vollständiger WebGPU-Modell-Download auf einem Zielgerät
- keine belastbare Messung von Ladezeit, RAM, Akkuverbrauch oder Generierungsgeschwindigkeit
- noch keine fachliche Qualitätsbewertung der generierten HEB-Texte
- noch keine Prüfung mit dem tatsächlich verwendeten HEB-Bogen / den Trägervorgaben
- noch keine produktive Hosting-URL
- keine Freigabe für echte Falldaten

## Freigaberegel

Bis die offenen Punkte geprüft sind, darf HEB-Assist ausschließlich mit vollständig fiktiven Testfällen verwendet werden.
