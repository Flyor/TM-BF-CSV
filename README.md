# 🧱 Brickfanatics EOL CSV Downloader

Ein Tampermonkey-Userscript zum automatischen Download von EOL (End of Life) LEGO-Set Daten von Brickfanatics.com als CSV-Datei.

## 📋 Features

- **Automatische Datenextraktion**: Extrahiert alle EOL-Daten von der Brickfanatics-Seite
- **CSV-Export**: Lädt die Daten als strukturierte CSV-Datei herunter
- **Jahresübergreifend**: Unterstützt EOL-Daten für die Jahre 2025-2030
- **Benutzerfreundlich**: Einfache Bedienung über ein schwebendes Button-Panel
- **Detailliertes Logging**: Umfassende Protokollierung aller Aktionen

## 🚀 Installation

1. **Tampermonkey installieren**: Falls noch nicht vorhanden, installiere die [Tampermonkey Browser-Extension](https://www.tampermonkey.net/)

2. **Script installieren**: 
   - **Automatisch**: Klicke auf [Installationslink](https://flyor.github.io/TM-BF-CSV/) (Tampermonkey öffnet sich automatisch)
   - **Manuell**: Öffne die Datei `TM.BF-CSV.js`, kopiere den Inhalt und füge ihn in Tampermonkey ein

3. **Verwendung**:
   - Gehe zu [Brickfanatics EOL-Seite](https://brickfanatics.com/every-lego-set-retiring-this-year-and-beyond/)
   - Das Script erstellt automatisch ein Button-Panel
   - Klicke auf "📥 CSV Download" um die Daten herunterzuladen

## 📊 CSV-Format

Die generierte CSV-Datei enthält folgende Spalten:
- **EOL Jahr**: Das Jahr, in dem das Set ausläuft
- **Set Nummer**: Die offizielle LEGO-Set-Nummer
- **Set Name**: Der Name des LEGO-Sets
- **Datum Export**: Zeitstempel des Exports

## 🎯 Unterstützte Seiten

- `https://brickfanatics.com/every-lego-set-retiring-this-year-and-beyond/*`
- `https://www.brickfanatics.com/every-lego-set-retiring-this-year-and-beyond/*`

## ⚙️ Konfiguration

Das Script kann über die `CONFIG`-Konstante angepasst werden:

```javascript
const CONFIG = {
    CSV_SEPARATOR: ';',           // CSV-Trennzeichen
    CSV_HEADER: 'EOL Jahr;Set Nummer;Set Name;Datum Export',
    YEARS: [2025, 2026, 2027, 2028, 2029, 2030],  // Zu parsende Jahre
    BUTTON_POSITION: 'top-right'  // Position des Button-Panels
};
```

## 🔧 Technische Details

- **Version**: 1.2.2
- **Autor**: Stonehiller Industries
- **Namespace**: http://tampermonkey.net/
- **Kompatibilität**: Moderne Browser mit Tampermonkey

## 📝 Changelog

### Version 1.2.2
- **Verbessertes Set-Parsing**: Erkennt jetzt auch Sets ohne Links (nur als Text)
- **Update-Links**: Automatische Updates über GitHub
- **Debug-Logging**: Erweiterte Debug-Ausgaben für bessere Fehlerdiagnose

### Version 1.2.1
- Initiale Veröffentlichung
- CSV-Export-Funktionalität
- Benutzerfreundliche UI
- Umfassendes Logging-System

## 🐛 Fehlerbehebung

**Problem**: Keine Daten gefunden
- **Lösung**: Stelle sicher, dass die Brickfanatics-Seite vollständig geladen ist
- **Hinweis**: Bei Cloudflare-Challenges manuell 3 Sekunden warten, dann Tab + Leertaste

**Problem**: Button-Panel nicht sichtbar
- **Lösung**: Seite neu laden und auf vollständiges Laden warten

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe LICENSE-Datei für Details.

## 🤝 Beitragen

Verbesserungsvorschläge und Bug-Reports sind willkommen! Bitte erstelle ein Issue oder einen Pull Request.

---

**Entwickelt mit ❤️ für die LEGO-Community**
