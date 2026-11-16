# SimHub Calendar · Projektspezifikation und Übergabe

Stand: 16. November 2026, Europe/Berlin. Diese Datei gibt einem neuen Modell den fachlichen und technischen Kontext unabhängig von Anbieter, IDE und bisherigem Chat. Prüfe vor Änderungen den tatsächlichen Workspace und den aktuellen Auftrag. Nach jedem Task kurz prüfen und nur festhalten, was für die weitere Arbeit relevant ist.

## 1. Projekt-Identität & Zielsetzung

**SimHub Calendar** ist ein lokaler Desktop-Kalender mit deutscher und englischer Oberfläche. Der Paketname lautet `electron-calendar`, der Produktname im App-Bundle `Electron Calendar` und die App-ID `dev.simhub.calendar`. Die aktuelle Version im Manifest ist **2.1.0**. Der Quellcode steht unter MIT und liegt im Repository [SimHub/simhub-electron-calendar](https://github.com/SimHub/simhub-electron-calendar).

Die App richtet sich an Menschen, die persönliche und berufliche Termine ohne fremdes Benutzerkonto oder Cloud-Zwang organisieren wollen. Alle Kalenderfunktionen arbeiten standardmäßig **100 % offline**. Die App kann Freitexte lokal in Terminentwürfe umwandeln und bei Bedarf ein lokales Modell (Ollama) oder eine kompatible API nutzen. Optionale Synchronisation mit CalDAV-Servern (z. B. Nextcloud, Apple iCloud) steht zur Verfügung.

### Produkt und Gestaltung

- **Ansichten:** Monats-, Wochen- und Agendaansicht, Tagesübersicht, Suche über Titel, Ort und Notizen sowie Filter für farblich getrennte Kalender.
- **Termine & Kalender:** Termine erstellen, bearbeiten und nach Bestätigung löschen. Kalender lassen sich umbenennen. Die Oberfläche weist auf Terminüberschneidungen im selben Kalender hin.
- **Zweisprachigkeit (i18n):** Volle Unterstützung von Deutsch (DE) und Englisch (EN). Umschaltung per 1-Klick-Toggle in der oberen Leiste (`🌐 DE`/`🌐 EN`) oder über die Einstellungen. Die Spracheinstellung wird in `app-settings.json` dauerhaft gesichert.
- **Tastaturkürzel:** `N` öffnet einen neuen Termin, `⌘/Strg K` die Suche und `Esc` schließt Dialoge.
- **Design & Branding:** Violette Markenfarbe, helle Oberfläche und ein Kalenderblatt mit geschwungenem S und grünem Tagesmarker als Icon (`ui/brand.svg`).
- **Synchronisation:** Optionale, sichere CalDAV-/ICS-Synchronisation für Nextcloud/ownCloud, Apple iCloud oder eigene CalDAV-Server. Zugangsdaten und Tokens werden über Electrons `safeStorage` im OS-Schlüsselbund verschlüsselt hinterlegt.

### Technik & Zero-Dependency-Prinzip

- **Laufzeit:** Node.js ab 22 (getestet mit 26.7.0) und npm (11.19.0).
- **Kerntechnologien:** Electron 45.2.3, electron-builder 26.18.0, Playwright 1.64.1 und `node:test`.
- **Architektur:** CommonJS im Hauptprozess (`desktop/`), natives Vanilla HTML/CSS/JavaScript im Renderer (`ui/`). Keine Frontend-Frameworks, kein Webpack, kein Bundler, keine externen CDN-Ressourcen oder Webserver.
- **Sicherheit & Sandbox:** Context Isolation, restriktive Content Security Policy (`default-src 'none'`), validierte IPC-Brücke (`desktop/ipc-security.cjs`), sicheres benutzerdefiniertes Protokoll (`simhub://calendar/`).
- **Persistenz:** Lokale atomare JSON-Persistenz (`calendar-v2.json`), automatische Datensicherung vor Import (`before-import-*.json`), 20 MB Limit (`MAX_DATA_BYTES`) für Daten und Backups.
- **Wichtig:** Alle temporären Dateien, Caches und Builds verbleiben strikt auf der externen SSD (`/Volumes/SL-JMircron-SSD/simhub-electron-calendar`), um den begrenzten internen SSD-Speicher des Mac mini M4 nicht zu belasten.

## 2. Aktuelle Workspace-Struktur

| Pfad | Funktion |
| --- | --- |
| `package.json`, `package-lock.json` | Manifest (v2.1.0), npm-Skripte, Electron-Builder-Konfiguration und gesicherte Abhängigkeiten. |
| `desktop/main.cjs` | App-Lifecycle, Fensterverwaltung, CSP, privilegierter Asset-Handler, IPC-Registrierung. |
| `desktop/preload.cjs`, `desktop/ipc-security.cjs` | Isolierte `window.calendarAPI`, strenge Ursprungs- und Frame-Prüfungen aller IPC-Aufrufe. |
| `desktop/model.cjs`, `desktop/store.cjs` | Datenmodell, Validierung, Migration, atomare Transaktionen und 20-MB-Größenüberwachung. |
| `desktop/parser.cjs` | Regelbasierte Offline-Eingabehilfe für Datums- und Zeitangaben ohne Netzwerk. |
| `desktop/assistant.cjs`, `desktop/settings.cjs` | KI-Anbindung (Ollama/API), Sync-Konfiguration (`sync-settings.json`), App-Einstellungen (`app-settings.json`) und OS-Keychain-Verschlüsselung (`safeStorage`). |
| `desktop/sync.cjs` | Nativer, abhangigkeitsfreier CalDAV- und ICS-Client für Nextcloud, iCloud und CalDAV-Server. |
| `desktop/agent.cjs` | Lokale CLI-Schnittstelle auf stdin/stdout für agentengestützte Kalenderentwürfe. |
| `ui/index.html`, `ui/styles.css`, `ui/app.js` | Kalenderansichten, Terminformular, Dialoge, Navigation, reaktive Render-Pipeline. |
| `ui/i18n.js` | Zero-Dependency Lokalisierungswörterbuch für Deutsch (`de`) und Englisch (`en`). |
| `ui/brand.svg`, `resources/`, `scripts/generate-icons.cjs` | SVG-Vektorbranding und Generierungsskripte für App-Icons (PNG, ICO, ICNS). |
| `test/*.test.cjs`, `test/electron.e2e.cjs`, `scripts/check.cjs` | 22 Unit-Tests (`node:test`), Playwright-E2E-Desktop-Testsuite und Syntaxprüfung. |
| `README.md`, `SECURITY.md`, `LICENSE` | Nutzerdokumentation, Sicherheitsrichtlinien und Lizenz. |
| `dist/` | Build-Ergebnisse (z. B. `dist/Electron Calendar-2.1.0-arm64.dmg`). |

## 3. Bisheriger Fortschritt & Meilensteine

| Meilenstein / Version | Beschreibung |
| --- | --- |
| **v1.x (Historisch)** | Ältere Version basierend auf TUI Calendar, Webpack und Spectron. |
| **v2.0.0** | Vollständige Neuentwicklung: Moderne Sandbox-Architektur, atomare Persistenz, Vektor-Branding, Zero-Dependency Renderer, automatische Backups vor Import, Absicherung des 20-MB-Rundlaufs (`MAX_DATA_BYTES`), Behebung von 504 Gateway Timeouts beim Electron-Builder-Download, GitHub Release v2.0.0. |
| **CalDAV & Cloud-Sync** | Nativer HTTPS CalDAV-Client (`desktop/sync.cjs`) ohne Fremdbibliotheken für Nextcloud und Apple iCloud; verschlüsselte Passwortablage im Schlüsselbund. |
| **Zweisprachigkeit (i18n)** | Vollständige Unterstützung von Deutsch und Englisch (`ui/i18n.js`) mit Sofort-Umschaltung im Topbar und Persistenz in den App-Einstellungen. |
| **v2.1.0 Release** | Version auf 2.1.0 aktualisiert, `README.md` erweitert, `npm run test:desktop` mit i18n-E2E-Assertions erfolgreich durchgeführt, DMG `Electron Calendar-2.1.0-arm64.dmg` gebaut und offiziell als GitHub Release `v2.1.0` publiziert. |

## 4. Aktueller Prüf- und Qualitätsstatus

- **Syntax & Paketstruktur:** `npm run check` fehlerfrei.
- **Unit-Tests:** `node --test test/*.test.cjs` mit **22 bestandenen Tests** (Model, Agent, Assistant, IPC-Sicherheit, Store, Sync/ICS).
- **Desktop E2E Tests:** `npm run test:desktop` (Playwright) bestätigt Sandbox-Isolierung, CRUD, Kalenderansichten, Filter, Suche, Backup/Restore, XSS-Schutz und den zweisprachigen Sprachwechsel (DE ↔ EN).
- **Sicherheits-Audit:** Lokales `npm audit` meldet **0 bekannte Schwachstellen**.
- **GitHub Status:** Branch `master` ist synchron mit `origin/master`. Release-Tags `v2.0.0` und `v2.1.0` sind live.

## 5. Arbeits- und Verhaltensrichtlinien

1. **Aktuellen Auftrag und Workspace zuerst prüfen:** Immer `git status --short --branch` ausführen und lokale Änderungen respektieren.
2. **Speicherort strikt beachten:** Alle Vorgänge, Caches und Builds müssen auf dem externen SSD-Pfad (`/Volumes/SL-JMircron-SSD/simhub-electron-calendar`) stattfinden, um die Mac mini Festplatte zu schonen.
3. **Architektur- und Zero-Dependency-Disziplin:**
   - Keine unnötigen npm-Pakete für Features hinzufügen, die sich sauber mit Node.js-Bordmitteln oder modernem Vanilla JS abbilden lassen.
   - Renderer bleibt frei von externen Netzwerkverbindungen (`CSP default-src 'none'`).
   - Alle Datei- und Netzwerkoperationen laufen ausschließlich über den isolierten Hauptprozess via validierte IPC-Kanäle.
4. **Sicherheit und Datenintegrität:**
   - Datenintegrität hat oberste Priorität: Backups, atomare Schreibvorgänge und das 20-MB-Limit beibehalten.
   - Passwörter und Tokens niemals im Klartext speichern – stets `safeStorage` nutzen.
   - Benutzerdaten und Termine bleiben lokal auf dem Gerät (Offline-First).
5. **Ergebnisse immer verifizieren:**
   - Nach Codeänderungen immer `npm run check` und `node --test test/*.test.cjs` ausführen.
   - Bei UI- oder IPC-Änderungen den Desktop-Test `npm run test:desktop` durchführen.

6. **Kontext nach jedem Task pflegen:** Diese Datei kurz prüfen und nur aktualisieren, wenn sich für die weitere Arbeit etwas Relevantes geändert hat. Dazu zählen Entscheidungen, der Projektstand, offene Punkte und nächste Schritte. Überholte Einträge ersetzen.

### Wichtige Befehle

```sh
npm ci                 # Abhängigkeiten sauber installieren
npm start              # App aus dem Quellcode starten
npm run check          # Syntax und Paketstruktur prüfen
npm test               # 22 Unit- und Integrationstests ausführen
npm run test:desktop   # Vollständige Playwright-Desktop-Suite testen
npm audit              # Paketabhängigkeiten auf Sicherheit prüfen
npm run pack           # Lokales arm64-Bundle unter dist/mac-arm64 erstellen
npm run release        # macOS DMG erstellen (ohne automatischen Upload)
```
