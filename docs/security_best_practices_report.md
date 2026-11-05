# Sicherheits- und Zugriffsbericht

Stand: 5. November 2026. Repository: SimHub/simhub-electron-calendar. Geprüfte Ausgangsbasis: Git-Commit `ba22b89` und die lokale, bereits vorhandene Änderung in package.json. Diese Änderung entfernte Konfliktmarker; die verbleibenden doppelten Einträge wurden bei der Modernisierung bereinigt.

## Ergebnis

Die kritische Kopplung zwischen Oberfläche und Betriebssystem wurde entfernt. Die neue Version verwendet Electron 45.2.3, eine isolierte Oberfläche ohne Laufzeitbibliotheken und eine kleine validierte Preload-Schnittstelle. Der aktuelle npm-Audit nach der gezielten minimatch-Korrektur meldet null bekannte Schwachstellen. Das ist keine Garantie, dass keine unbekannten Schwachstellen existieren.

Die direkten fremden Schreibrechte und der nicht mehr gewünschte Timely-Webhook wurden tatsächlich auf GitHub entfernt. Die Quellcodeänderungen gehören zur Modernisierung auf Version 2.0. Eine Veröffentlichung signierter App-Binaries ist damit nicht verbunden.

## Behobene Befunde

### S01 · Kritisch · Node.js-Zugriff aus der Oberfläche

**Auswirkung:** Eine Skriptinjektion konnte im alten Renderer auf Node.js und damit auf lokale Betriebssystemfunktionen zugreifen.

Beleg der Ausgangsbasis: `git show ba22b89:src/background.js`, Zeilen 38–40 (`nodeIntegration: true`, `contextIsolation: false`, `enableRemoteModule: true`). Zusätzlich wurde aus Renderer-Code direkt `electron-json-storage` geladen.

Behebung: `desktop/main.cjs:18` aktiviert Context Isolation und Sandbox und deaktiviert Node.js. `desktop/preload.cjs:3` stellt nur feste Fähigkeiten bereit. IPC-Absender und Hauptframe werden in `desktop/main.cjs:27` geprüft. Navigation, Fensteröffnung, Webviews und Browserberechtigungen werden blockiert. Ausgeliefert werden ausschließlich freigegebene lokale Dateien über ein eigenes Protokoll mit restriktiver CSP.

Validierung: echter Electron-Test prüft die aktiven WebPreferences und dass `window.require` nicht verfügbar ist.

### S02 · Hoch · Ungeprüfte HTML-Ausgabe von Kalenderdaten

Beleg der Ausgangsbasis: `git show ba22b89:src/app.js`, der Abschnitt „set calendars“, fügt Kalendernamen und Attribute per Stringverkettung in `innerHTML` ein. In Kombination mit S01 erhöhte dies die Auswirkungen einer Injektion erheblich.

Behebung: `ui/app.js:13` erzeugt Elemente über DOM-APIs und `textContent`; Kalendernamen und Termintitel werden als Text eingefügt. `desktop/model.cjs:16` validiert eingehende Termine, IDs, Kalenderzugehörigkeit, Zeiträume und Textlängen. CSS-Farben kommen aus einer festen Liste.

Validierung: Termintitel mit `<img src=x onerror=alert(1)>` bleibt im Desktop-Test Text; es entsteht kein Bildknoten.

### S03 · Hoch · Veralteter und widersprüchlicher Unterbau

Ausgangsbasis: Electron 13, Webpack 4, Spectron, doppelte Dependency-Einträge und alte Snyk-Prepare-Skripte. Die Ausgangsbasis war nicht zuverlässig installierbar. Kein alter Audit wurde ausgeführt; eine konkrete Zahl alter CVEs wird daher nicht behauptet.

Behebung: Electron und Verpackungswerkzeug aktualisiert und fest versioniert. Alte gebündelte Bibliotheken und die doppelte src/app-Struktur entfernt. Keine Produktionsabhängigkeiten. Der neue Audit identifizierte eine moderate minimatch-Schwachstelle im Build-Baum; eine auf die verwundbaren Versionen begrenzte Override behebt diese. Die macOS-Paketierung wurde mit dem korrigierten Baum ausgeführt.

### S04 · Mittel · Schreibverluste und unvollständige Terminupdates

Ausgangsbasis: `src/app.js` übernahm Änderungen über Wahrheitsprüfungen. Dadurch konnten etwa `false` und leere Felder verloren gehen; Kalenderwechsel und Datumsupdates waren inkonsistent.

Behebung: `desktop/store.cjs:41` serialisiert Schreiboperationen, validiert vollständige Datensätze und aktualisiert den Arbeitsspeicher erst nach erfolgreichem atomarem Dateiaustausch. `desktop/store.cjs:36` schreibt eine temporäre Datei mit restriktiven Rechten und benennt sie anschließend um. Fehlerhafte Originaldaten werden nicht überschrieben. Der alte storage-Ordner bleibt bei Migration erhalten.

Validierung: Tests für parallele Schreiboperationen, leere Felder, false, Kalenderwechsel, fehlgeschlagene Datenträgeroperationen, kaputte Dateien, Migration und Wiederherstellung.

### S05 · Mittel · Repository-Zugriffe und Automation

Repository-Zugriffe und bestehende Integrationen wurden geprüft und nach Auswahl des Eigentümers bereinigt. GitHub Actions hat nur Leserechte als Standard, kann Pull Requests nicht selbst genehmigen und ist in diesem Repository vollständig deaktiviert. Die mitgelieferten Workflows können nur manuell und nur für öffentliche Repositories laufen.

Details der kontobezogenen Zugriffsprüfung werden nicht mit dem öffentlichen Quellcode veröffentlicht. Historische Contributor- und Lizenzangaben bleiben erhalten und verleihen keine Repository-Rechte.

## Neue KI- und Agentengrenzen

`desktop/assistant.cjs:26` begrenzt Eingaben und validiert KI-Antworten. Anfragen haben Zeit- und Größenlimits. API-Endpunkte benötigen HTTPS und dürfen keine eingebetteten Zugangsdaten enthalten. Redirects werden abgewiesen. Ollama verwendet ausschließlich Loopback. Keine Shell-Werkzeuge, keine automatisch ausführbaren Modellaktionen, kein direkter Schreibzugriff des Modells.

`desktop/settings.cjs:30` speichert API-Schlüssel nur verschlüsselt über Electron safeStorage; unsichere Linux-basic_text-Ablage wird abgelehnt. Schlüssel werden nach dem Speichern nicht an die Oberfläche ausgegeben. Environment-Schlüssel werden nicht persistiert. Neue API-Endpunkte erfordern eine erneute Schlüsselangabe.

`desktop/agent.cjs` bietet eine lokale JSON-Schnittstelle für Fähigkeiten, explizit freigegebenes Lesen und Terminentwürfe. Kein Netzwerkserver, keine direkten Kalendermutationen. Entwürfe werden in der App validiert und erst nach Benutzeraktion gespeichert. Kein externer MCP-Server enthalten.

## Verbleibende Grenzen

### S06 · Mittel · Release-Signierung fehlt

Das macOS-arm64-App-Paket wurde erzeugt. Auf diesem Rechner wurde kein gültiges Developer-ID-Zertifikat für die Veröffentlichung gefunden. Das Paket ist unsigniert und nicht notarisiert. Es wurde nicht veröffentlicht. Windows- und Linux-Builds wurden lokal nicht ausgeführt.

### S07 · Hinweis · GitHub-Automation

GitHub Actions bleibt wegen der Kostenanforderung deaktiviert. Repository-Regeln und kontoweite Freigaben sind separat durch den Eigentümer zu verwalten; sie sind keine Anwendungseinstellungen.

### S08 · Hinweis · Lokale Kalenderdateien sind Klartext

Termine und Backups sind JSON-Dateien. Sie sind nicht Ende-zu-Ende-verschlüsselt. Dateirechte, ein geschütztes Betriebssystemkonto und Datenträgerverschlüsselung bleiben erforderlich. Ein Backup enthält persönliche Kalenderdaten.

### S09 · Hinweis · KI-Livebetrieb und Altbestände

Kein reales Modell wurde heruntergeladen und keine kostenpflichtige KI-Anfrage ausgelöst. KI-Adapter wurden mit kontrollierten Antworten getestet. Die Migration wurde mit Testdaten, nicht mit einem persönlichen Kalenderbestand geprüft. Wiederholungsregeln und sonstige TUI-Spezialfelder werden nicht übernommen; die Originaldateien bleiben erhalten. Vor Nutzung mit echten Altdaten zunächst den alten Datenordner sichern.

## Validierung

- `npm test`: 17 Tests bestanden.
- `npm run check`: JavaScript-Syntax und Paketstruktur geprüft.
- `npm run test:desktop`: echte Electron-App; CRUD, Persistenz, Ansichten, Suche, Filter, XSS, lokale Entwurfsvorschau, Backup-Import/Export, Agenten-Dateientwurf und KI-Einstellungsformular bestanden.
- `npm audit`: null bekannte Schwachstellen nach gezielter Override.
- `npm run pack`: macOS arm64 erfolgreich, ohne Release-Signatur. Der vollständige Desktop-Test wurde anschließend auch gegen das erzeugte App-Bundle ausgeführt und bestand.
- Visuelle Prüfung: große und kompakte Desktopansicht; Screenshots unter `test-results/` (ignoriert).

Referenzen: [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security), [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [Ollama Chat API](https://docs.ollama.com/api/chat).

## Gebührenprüfung

Es wurden keine kostenpflichtigen GitHub-Produkte oder Codespaces angelegt. Actions ist im Repository deaktiviert. Lokale Tests und Verpackung erzeugen keine GitHub-Runnergebühren. Bestehende Abos und bereits entstandene Kosten werden dadurch nicht geändert.

[GitHub Actions: Abrechnung von Runnern und Speicher](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Korrektur der IPC-Adressprüfung

Ein Klick auf das frühere Logo-Linkziel `#` änderte die Adresse auf `simhub://calendar/index.html#`. Die ursprüngliche exakte Stringprüfung verweigerte daraufhin legitime IPC-Aufrufe, darunter Speichern. Der Fehler wurde in einer isolierten Electron-Instanz reproduziert.

`desktop/ipc-security.cjs` ignoriert jetzt ausschließlich das URL-Fragment. Fenster, Hauptframe, Protokoll, Host, Pfad und Query bleiben streng geprüft. Das Logo verwendet einen Button ohne Adressänderung. Regressionstests prüfen Zugriff nach Fragmentnavigation sowie die Ablehnung fremder Fenster, Subframes, URLs und ungültiger Frames. Der Desktop-Test speichert und bearbeitet Termine nach einem Logo-Klick und einer Fragmentnavigation.
