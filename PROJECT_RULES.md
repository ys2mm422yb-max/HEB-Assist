# PROJECT_RULES

Diese Regeln sind für HEB-Assist verbindlich.

## 1. Strikte Projekttrennung

- HEB-Assist darf keine Abhängigkeit zu bestehenden privaten Projekten des Repository-Inhabers haben.
- Keine gemeinsam genutzten Datenbanken, API-Schlüssel, Secrets, Nutzerkonten, Deployments oder Backends.
- Kein Kopieren echter Fall-/Bewohnerdaten aus anderen Systemen.
- Das GitHub-Repository darf öffentlich sein. Deshalb ist **jeder Inhalt des Repositories so zu behandeln, als könnte er öffentlich eingesehen werden**.
- **Niemals** echte Bewohner-/Falldaten, Namen, identifizierende Angaben, interne Zugangsdaten, API-Schlüssel, Secrets, vertrauliche interne Dokumente oder sonstige datenschutzrechtlich geschützte Informationen in GitHub ablegen – weder in Code noch in Commits, Issues, Pull Requests, Tests, Screenshots, Logs, Beispielen oder Dokumentation.
- Auch synthetische Beispiele dürfen keine echten Personen oder reale Fälle nachbilden oder aus realen Fällen abgeleitet sein.

## 2. Git-Workflow

- Solange HEB-Assist ausdrücklich als Test-/Entwicklungsprojekt geführt wird, darf direkt auf `main` gearbeitet werden.
- Vor einer späteren Produktivfreigabe wird der strengere Branch-/PR-Workflow wieder eingeführt.
- Datenschutz-, KI- und Sicherheitsregeln bleiben auch während direkter Arbeit auf `main` verbindlich und müssen nachvollziehbar dokumentiert werden.

## 3. Datenschutz als technische Vorgabe

- Keine echten Namen oder anderweitig identifizierenden Falldaten in Code, Issues, Pull Requests, Tests, Screenshots, Logs oder Beispieldateien.
- Testdaten sind vollständig synthetisch.
- Die App darf Eingaben nicht zu Analyse-, Telemetrie- oder Trainingszwecken versenden.
- Externe Netzwerkzugriffe müssen dokumentiert und technisch auf das Nötigste beschränkt werden.
- Vor jedem neuen Datei-, Log-, Screenshot-, Beispiel- oder Dokumentationsinhalt ist zu prüfen, ob darin datenschutzrelevante oder vertrauliche Informationen enthalten sein könnten.

## 4. Keine zentrale Fallhistorie in v1

- Keine Cloud-Datenbank für HEB-Texte.
- Keine serverseitige Chat-Historie.
- Keine automatische Synchronisation zwischen Geräten.
- Falls später lokale Entwürfe angeboten werden, müssen sie standardmäßig deaktiviert oder klar als rein lokal gekennzeichnet sein.

## 5. KI-Verhalten

- Keine erfundenen Informationen.
- Keine Diagnoseableitung aus Alltagsbeschreibungen.
- Keine automatische medizinische oder rechtliche Entscheidung.
- Keine endgültige fachliche Bewertung ohne Hinweis auf menschliche Prüfung.
- Aussagen des Nutzers dürfen sprachlich verbessert, aber inhaltlich nicht erweitert werden.
- HEB-Eingaben dürfen erst verarbeitet werden, wenn das tatsächliche lokale Sprachmodell vollständig gestartet und einsatzbereit ist.
- Kein versteckter regel-/regexbasierter Ersatzmodus darf als KI-Ausgabe erscheinen oder bei ausgefallenem Sprachmodell automatisch HEB-Texte erzeugen.
- Der Status muss eindeutig zwischen Laden, einsatzbereiter KI und Startfehler unterscheiden.

## 6. Qualität

- Mobile-first testen.
- Datenschutzfilter mit Positiv- und Negativtests absichern.
- Kernworkflow muss ohne Benutzerkonto funktionieren.
- Produktivfreigabe erst nach gesonderter fachlicher und datenschutzrechtlicher Prüfung.

## 7. Automatische App-Updates

- HEB-Assist muss neue veröffentlichte Versionen automatisch erkennen und übernehmen.
- Beim Öffnen, beim Zurückkehren in die App und während längerer Nutzung wird automatisch nach Updates gesucht.
- App-Code wird online bevorzugt frisch geladen; der Cache dient als Offline-Fallback und darf keine veraltete Version dauerhaft festhalten.
- Ein Update darf keine aktive HEB-Eingabe oder noch nicht kopierte Ausgabe durch einen erzwungenen Neustart verlieren lassen.
- Wenn während aktiver Arbeit eine neue Version bereitsteht, wird sie automatisch beim nächsten sicheren Zeitpunkt bzw. beim nächsten frischen Öffnen übernommen.
- Kolleginnen und Kollegen sollen weder Cache leeren noch die PWA neu installieren müssen, um eine neue Version zu erhalten.
