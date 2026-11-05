# Sicherheit

Unterstützt wird die aktuelle Version 2.x. Alte 1.x-Binaries bitte nicht mehr verwenden.

Bitte Sicherheitslücken nicht mit privaten Kalenderdaten oder Zugangsschlüsseln in öffentlichen Issues melden. Nutze „Report a vulnerability“ unter GitHub → Security, sofern Private Vulnerability Reporting aktiviert ist. Andernfalls kontaktiere den Maintainer über dessen GitHub-Profil und teile zunächst nur eine allgemeine Beschreibung.

Die Oberfläche läuft mit Sandbox, Context Isolation und ohne Node.js-Zugriff. Eine kleine Preload-Schnittstelle vermittelt validierte Aufrufe. Navigation, neue Fenster, Webviews und Browserberechtigungen werden blockiert. Eine restriktive CSP verbietet externe Inhalte und Netzwerkanfragen aus der Oberfläche. Nur der Hauptprozess kann den ausdrücklich konfigurierten KI-Dienst anfragen. Über die Einstellungen eingegebene API-Schlüssel werden mit Electron safeStorage verschlüsselt gespeichert; eine unsichere basic_text-Ablage wird verweigert.

Termine und Backups sind lokale JSON-Dateien, nicht Ende-zu-Ende-verschlüsselt. Betriebssystemkonto und Datenträgerverschlüsselung schützen sie. KI ist standardmäßig deaktiviert; API-Betrieb sendet den eingegebenen Text und Kalendernamen an den konfigurierten Anbieter. Modellantworten können keine Befehle ausführen und werden vor der Vorschau validiert. Speichern erfolgt ausdrücklich durch den Benutzer.

Veröffentlichungen benötigen zusätzliche Betriebssystem-Signierung/Notarisierung. Diese ist nicht im Repository eingerichtet. Vor Releases `npm ci`, `npm run check`, `npm test`, `npm audit` und einen Smoke-Test der Zielplattform durchführen.
