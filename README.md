# Cookie-Checking Crawler

## Zielsetzung

Das Projekt analysiert, wie verschiedene Browser und deren Einstellungen das Setzen von Cookies beim Webseitenaufruf beeinflussen. Ziel ist es, durch eine grafische Aufarbeitung herauszufinden, welche technischen Mechanismen zum Tracking wirksam sein könnten und wie sie sich zwischen Browsern und Konfigurations-Flags unterscheiden.

## Erkenntnisgewinn

- Untersuche, welche Cookies bei einem Webseitenbesuch unter unterschiedlichen Browser-Konfigurationen gesetzt werden.
- Analysiere den Einfluss von Einstellungen (JavaScript, Cookie-Banner, Adblocker) auf das Setzen und die Klassifizierung von Cookies.


## Vorgehen \& Methodik

- Auswahl der Seeds: Nachrichten- und newsnahe Webseiten mit hohem Cookie-Tracking-Potential (z. B. bild.de, gmx.de).
- Crawl-Tiefe: Es wird ausschließlich die Hauptseite jeder Domain besucht (Tiefe 0).
- Frequenz: Jede Seite wird nur einmalig und zum selben Zeitpunkt abgerufen, da Tracking meist unabhängig von der Tageszeit ist.
- Keine weitere Nutzerinteraktion; Analyse beschränkt sich auf den ersten Seitenaufruf.


## Programmablauf

### Cookie-Erfassung

- Webseiten werden automatisiert mit unterschiedlichen Browsern (Chromium, Brave, Firefox) und Konfigurationen aufgerufen (mit/ohne JS, Cookie-Banner, optional Adblocker).
- Jeder Request erfasst: Name, Inhalt, Domain, Erstellungszeitpunkt, Ablauf, Lokalisierung und Zugehörigkeit zur Session.
- Ergebnisse werden direkt in einer PostgreSQL-Datenbank abgelegt; jede Konfiguration wird nur einmal getestet.


### Visualisierung

- Interaktives Frontend (Angular) mit Auswahlmöglichkeiten für Flags (Browser, JS, Cookiebanner, Adblocker).
- User konfiguriert Filter, Backend liefert passende Daten aus der Datenbank.
- Darstellung per ChartJs: Vergleich der Cookie-Ergebnisse nach gewählter Konfiguration.
- Klassifizierung: Third-Party-Cookies werden direkt als Tracking-Cookies gewertet. First-Party-Cookies werden anhand von Domains, Schlüsselwörtern und Mustern weiter analysiert (z. B. ga, UID, track).


## Technischer Rahmen

| Schicht | Technologie | Zweck |
| :-- | :-- | :-- |
| Backend | Typescript, Puppeteer | Steuert Browser, erfasst Cookie-Daten[^1] |
| Datenbank | PostgreSQL | Relationale Speicherung der Sessions |
| Frontend | Angular | Nutzeroberfläche, Filter \& Visualisierung |
| Visualisierung | ChartJs | Interaktive Diagramme |
| Styling | TailwindCss | UI-Design |

## Aufgabenplanung

- Umsetzung des Datenbankschemas
- Implementierung Backend-API (Crawl, Konfigurations-Flags, Datenabfrage)
- Crawling-Logik mit Puppeteer
- Mechanismus für Cookie-P parsing und Klassifizierung
- Entwicklung Frontend-GUI, Anzeige und Filter für Cookies \& Sessions
- Ausarbeitung von Visualisierung und Gruppierung der Cookie-Daten
- Basis-Dokumentation des Projektes
