# PRIVACY_POLICY – technische Datenschutzregeln

> Entwicklungsregelwerk für HEB-Assist. Dies ist noch keine abschließende rechtliche Datenschutzerklärung für einen späteren Produktivbetrieb.

## Datenschutz-Zielbild für v1

HEB-Assist soll HEB-Formulierungen erzeugen, ohne Falltexte zentral zu speichern. Die KI-Inferenz soll direkt auf dem verwendeten Endgerät im Browser erfolgen.

## Daten, die nicht eingegeben werden sollen

Der Eingabefilter soll insbesondere erkennen bzw. blockieren:

- Vor- und Nachnamen bzw. offensichtliche Personennamen
- vollständige Geburtsdaten
- vollständige postalische Adressen
- Telefonnummern
- E-Mail-Adressen
- Versicherungs-, Akten-, Bewohner- oder vergleichbare Identifikationsnummern
- eindeutige Kombinationen aus personenbezogenen Merkmalen, soweit technisch erkennbar

Kein automatischer Filter kann vollständige Anonymität garantieren. Die Benutzeroberfläche muss deshalb zusätzlich klar darauf hinweisen, nur nicht identifizierende Beschreibungen einzugeben.

## Speicherung

In v1 gilt:

- keine zentrale Datenbank für Falltexte
- keine serverseitige Chat-Historie
- keine Analytics mit Texteingaben
- keine Fehlerlogs mit Texteingaben
- keine Übertragung von Eingaben an GitHub, Hostinganbieter oder Modell-Repository

Das KI-Modell darf beim ersten Gebrauch aus einer externen Quelle heruntergeladen und anschließend vom Browser gecacht werden. Dieser Modelldownload enthält keine HEB-Eingaben.

## Netzwerk

Nach Laden der Web-App und des Modells soll die eigentliche Textverarbeitung lokal erfolgen. Netzwerkzugriffe werden auf notwendige statische App-/Modellressourcen begrenzt.

## Entwicklung und Tests

- ausschließlich synthetische Testfälle
- keine echten Bewohnerdaten in Git, PRs, Issues oder Screenshots
- kein Debug-Logging des vollständigen Nutzereingabetextes
- sicherheitsrelevante Änderungen werden im Pull Request dokumentiert

## Produktivfreigabe

Vor einer tatsächlichen Nutzung mit beruflichen Falldokumentationen sind mindestens erforderlich:

1. fachliche Freigabe der Formulierungslogik,
2. Datenschutzprüfung der realen Bereitstellung/Hosting-Konfiguration,
3. Prüfung der verwendeten Modell- und Bibliothekslizenzen,
4. Tests auf den tatsächlich eingesetzten iOS-/Android-Geräten,
5. klare Nutzerhinweise zu nicht identifizierenden Eingaben und menschlicher Endkontrolle.
