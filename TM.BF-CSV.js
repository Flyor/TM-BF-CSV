// ==UserScript==
// @name         Brickfanatics EOL CSV Downloader
// @namespace    http://tampermonkey.net/
// @version      1.2.2
// @description  Extrahiert EOL-Daten von Brickfanatics.com und lädt sie als CSV herunter
// @author       Stonehiller Industries
// @match        https://brickfanatics.com/every-lego-set-retiring-this-year-and-beyond/*
// @match        https://www.brickfanatics.com/every-lego-set-retiring-this-year-and-beyond/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=brickfanatics.com
// @grant        none
// @updateURL    https://flyor.github.io/TM-BF-CSV/TM.BF-CSV.js
// @downloadURL  https://flyor.github.io/TM-BF-CSV/TM.BF-CSV.js
// ==/UserScript==

(function() {
    'use strict';

    // ===== VERSION =====
    const VERSION = '1.2.2';
    
    // ===== UTILITY FUNCTIONS =====
    
    // Einfache Checksumme für Chunk-Validierung
    function calculateChecksum(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
    
    // ===== LOG-SYSTEM =====
    const LOG = {
        entries: [],
        maxEntries: 100,
        
        add: function(type, message) {
            const timestamp = new Date().toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            this.entries.unshift({ timestamp, type, message });
            
            // Begrenze Log-Einträge
            if (this.entries.length > this.maxEntries) {
                this.entries.pop();
            }
            
            // Auch in Console loggen
            const consoleMsg = `[BF-CSV2] ${message}`;
            switch(type) {
                case 'error': console.error(consoleMsg); break;
                case 'warn': console.warn(consoleMsg); break;
                case 'success': console.log(consoleMsg); break;
                default: console.debug(consoleMsg);
            }
        },
        
        getFormatted: function() {
            if (this.entries.length === 0) {
                return '📋 Keine Log-Einträge vorhanden.';
            }
            
            let log = `📋 Log (${this.entries.length} Einträge):\n\n`;
            this.entries.forEach(entry => {
                const icon = {
                    'error': '❌',
                    'warn': '⚠️',
                    'success': '✅',
                    'info': 'ℹ️'
                }[entry.type] || '•';
                
                log += `${icon} ${entry.timestamp}\n${entry.message}\n\n`;
            });
            return log;
        },
        
        clear: function() {
            this.entries = [];
            console.log('[BF-CSV2] Log wurde geleert');
        }
    };

    // ===== KONFIGURATION =====
    const CONFIG = {
        // CSV Konfiguration
        CSV_SEPARATOR: ';',
        CSV_HEADER: 'EOL Jahr;Set Nummer;Set Name;Datum Export',
        
        // Jahre die geparst werden sollen
        YEARS: [2025, 2026, 2027, 2028, 2029, 2030],
        
        // UI Konfiguration
        BUTTON_POSITION: 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
    };

    // ===== DATENEXTRAKTION =====
    
    /**
     * Extrahiert alle EOL-Daten von der aktuell geöffneten Seite
     * @returns {Object} Struktur: { masterSets: {...}, setsByYear: {...}, lastUpdate: '...' }
     */
    function extractEOLData() {
        console.debug('[BF-CSV2] Starte Datenextraktion...');
        
        let masterSets = {}; // { setNum: { name, eol } }
        let setsByYear = {}; // { year: [{num, name, eol}, ...] }
        
        // Initialisiere Jahre
        CONFIG.YEARS.forEach(year => {
            setsByYear[year] = [];
        });
        
        // Extrahiere Last Update Datum
        let lastUpdate = '';
        const updateElement = document.querySelector('strong');
        if (updateElement && updateElement.textContent.includes('Last update')) {
            lastUpdate = updateElement.parentElement.textContent
                .replace(/.*Last update:\s*/i, '').trim();
        }
        
        // Extrahiere Sets für jedes Jahr
        CONFIG.YEARS.forEach(year => {
            console.log(`[BF-CSV2] Suche nach Sets für Jahr ${year}...`);
            
            // Suche nach ALLEN Überschriften mit diesem Jahr
            const headings = document.querySelectorAll(`h2`);
            let yearFound = false;
            
            headings.forEach(heading => {
                if (heading.textContent.includes(`retiring in ${year}`)) {
                    console.log(`[BF-CSV2] ✅ Gefunden: ${heading.textContent.trim()}`);
                    LOG.add('info', `Kategorie gefunden: ${heading.textContent.trim()}`);
                    yearFound = true;
                    
                    // Finde alle Tabellen nach dieser Überschrift
                    let nextElement = heading.nextElementSibling;
                    let searchSteps = 0;
                    
                    while (nextElement && searchSteps < 20) {
                        searchSteps++;
                        
                        // Suche nach Tabellen in diesem Element oder seinen Kindern
                        const tables = nextElement.querySelectorAll('table');
                        tables.forEach(table => {
                            console.log(`[BF-CSV2] ✅ Tabelle gefunden in ${heading.textContent.trim()}`);
                            
                            // Parse Tabelle
                            const rows = table.querySelectorAll('tbody tr');
                            console.log(`[BF-CSV2] ${rows.length} Zeilen in Tabelle`);
                            
                            rows.forEach(row => {
                                const cells = row.querySelectorAll('td');
                                if (cells.length > 0) {
                                    // Erste Zelle enthält den Set-Namen (als Link ODER als Text)
                                    const firstCell = cells[0];
                                    const link = firstCell.querySelector('a');
                                    
                                    let setText = '';
                                    if (link) {
                                        // Set als Link
                                        setText = link.textContent.trim();
                                        console.debug(`[BF-CSV2] Link gefunden: "${setText}"`);
                                    } else {
                                        // Set als reiner Text
                                        setText = firstCell.textContent.trim();
                                        console.debug(`[BF-CSV2] Text gefunden: "${setText}"`);
                                    }
                                    
                                    const match = setText.match(/^(\d+)\s+(.+)$/);
                                    
                                    if (match) {
                                        const setNum = match[1];
                                        const setName = match[2];
                                        console.debug(`[BF-CSV2] Set geparst: ${setNum} - ${setName}`);
                                        
                                        // Prüfe ob Set bereits existiert (vermeide Duplikate)
                                        const existingSet = setsByYear[year].find(set => set.num === setNum);
                                        if (!existingSet) {
                                            // Füge zu Jahr-Liste hinzu
                                            setsByYear[year].push({
                                                num: setNum,
                                                name: setName,
                                                eol: year
                                            });
                                            
                                            // Füge zu Master-Liste hinzu (nur frühestes Jahr)
                                            if (!masterSets[setNum] || year < masterSets[setNum].eol) {
                                                masterSets[setNum] = {
                                                    name: setName,
                                                    eol: year
                                                };
                                            }
                                            
                                            console.debug(`[BF-CSV2] Set hinzugefügt: ${setNum} ${setName}`);
                                        }
                                    } else {
                                        console.debug(`[BF-CSV2] Kein Set-Pattern gefunden in: "${setText}"`);
                                    }
                                }
                            });
                        });
                        
                        // Stoppe wenn wir zur nächsten h2-Überschrift kommen
                        if (nextElement.tagName === 'H2') {
                            break;
                        }
                        
                        nextElement = nextElement.nextElementSibling;
                    }
                }
            });
            
            if (!yearFound) {
                console.warn(`[BF-CSV2] ⚠️ Keine Überschriften gefunden für Jahr ${year}`);
                LOG.add('warn', `Jahr ${year}: Keine Überschriften gefunden!`);
            }
            
            console.log(`[BF-CSV2] Jahr ${year}: ${setsByYear[year].length} Sets gefunden`);
            LOG.add('info', `Jahr ${year}: ${setsByYear[year].length} Sets`);
        });
        
        const totalSets = Object.keys(masterSets).length;
        console.log(`[BF-CSV2] ========== EXTRAKTION ABGESCHLOSSEN ==========`);
        console.log(`[BF-CSV2] Gesamt: ${totalSets} Sets`);
        CONFIG.YEARS.forEach(year => {
            console.log(`[BF-CSV2] - ${year}: ${setsByYear[year].length} Sets`);
        });
        LOG.add('success', `Datenextraktion abgeschlossen: ${totalSets} Sets insgesamt`);
        
        return {
            masterSets: masterSets,
            setsByYear: setsByYear,
            lastUpdate: lastUpdate,
            totalSets: totalSets
        };
    }

    // ===== CSV-FUNKTIONEN =====
    
    /**
     * Erstellt CSV-Inhalt aus den extrahierten Daten
     * @param {Object} data - Extrahierte EOL-Daten
     * @returns {String} CSV-Inhalt
     */
    function createCSV(data) {
        console.debug('[BF-CSV2] Erstelle CSV...');
        
        const csvLines = [];
        
        // Header
        csvLines.push(CONFIG.CSV_HEADER);
        
        // Sets nach EOL-Jahr und Setnummer sortieren
        const sortedSets = Object.keys(data.masterSets)
            .map(setNum => ({
                num: setNum,
                name: data.masterSets[setNum].name,
                eol: data.masterSets[setNum].eol
            }))
            .sort((a, b) => {
                // Erst nach EOL-Jahr, dann nach Setnummer
                if (a.eol !== b.eol) {
                    return a.eol - b.eol;
                }
                return parseInt(a.num, 10) - parseInt(b.num, 10);
            });
        
        // CSV Zeilen erstellen
        const exportDate = new Date().toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        sortedSets.forEach(set => {
            const csvLine = [
                set.eol,
                set.num,
                `"${set.name.replace(/"/g, '""')}"`, // Name in Anführungszeichen, doppelte Anführungszeichen escapen
                exportDate
            ].join(CONFIG.CSV_SEPARATOR);
            
            csvLines.push(csvLine);
        });
        
        console.debug(`[BF-CSV2] CSV erstellt: ${sortedSets.length} Zeilen`);
        
        return csvLines.join('\n');
    }
    
    /**
     * Lädt CSV-Datei herunter
     * @param {String} csvContent - CSV-Inhalt
     */
    function downloadCSV(csvContent) {
        console.debug('[BF-CSV2] Starte CSV-Download...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `brickfanatics_eol_${timestamp}.csv`;
        
        // Erstelle Blob und Download-Link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        LOG.add('success', `CSV-Download erfolgreich: ${filename}`);
        showNotification('✅ CSV-Download erfolgreich!', 'success');
    }

    

    // ===== UI-FUNKTIONEN =====
    
    /**
     * Erstellt und zeigt das Button-Panel an
     */
    function createButtonPanel() {
        console.debug('[BF-CSV2] Erstelle Button-Panel...');
        
        // Container für Buttons
        const panel = document.createElement('div');
        panel.id = 'bf-csv2-panel';
        panel.style.cssText = `
            position: fixed;
            ${getPositionCSS()}
            z-index: 10000;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            min-width: 250px;
        `;
        
        // Titel mit Version
        const title = document.createElement('div');
        title.textContent = `🧱 BF-CSV2 Exporter`;
        title.style.cssText = `
            color: white;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 4px;
            text-align: center;
        `;
        panel.appendChild(title);
        
        // Version
        const version = document.createElement('div');
        version.textContent = `v${VERSION}`;
        version.style.cssText = `
            color: rgba(255, 255, 255, 0.7);
            font-size: 11px;
            margin-bottom: 12px;
            text-align: center;
        `;
        panel.appendChild(version);
        
        // CSV-Download Button
        const csvButton = createButton('📥 CSV Download', () => {
            try {
                const data = extractEOLData();
                if (data.totalSets === 0) {
                    showNotification('❌ Keine Daten gefunden!\nBitte stelle sicher, dass die Seite vollständig geladen ist.', 'error');
                    return;
                }
                const csv = createCSV(data);
                downloadCSV(csv);
                console.debug('[BF-CSV2] CSV-Download erfolgreich (funktioniert immer, unabhängig von ioBroker)');
            } catch (error) {
                console.error('[BF-CSV2] Fehler beim CSV-Download:', error);
                showNotification(`❌ Fehler beim CSV-Download:\n${error.message}`, 'error');
            }
        });
        panel.appendChild(csvButton);
        
        // (ioBroker Upload Button entfernt)
        
        // Info Button
        const infoButton = createButton('ℹ️ Info', () => {
            try {
                const data = extractEOLData();
                let info = `🧱 Brickfanatics EOL Exporter v${VERSION}\n\n`;
                info += `📊 Statistik:\n`;
                info += `• Gesamt: ${data.totalSets} Sets\n`;
                CONFIG.YEARS.forEach(year => {
                    info += `• ${year}: ${data.setsByYear[year].length} Sets\n`;
                });
                info += `\n📅 Letzte Aktualisierung:\n${data.lastUpdate || 'Unbekannt'}\n`;
                // (ioBroker-URL Anzeige entfernt)
                
                showNotification(info, 'info', 10000);
            } catch (error) {
                console.error('[BF-CSV2] Fehler beim Abrufen der Info:', error);
                showNotification(`❌ Fehler:\n${error.message}`, 'error');
            }
        });
        panel.appendChild(infoButton);
        
        // Log Button (minimiert)
        const logButton = createButton('📋', () => {
            const logText = LOG.getFormatted();
            showNotification(logText, 'info', 15000);
        }, true);
        panel.appendChild(logButton);
        
        // (ioBroker Settings-Button entfernt)
        
        document.body.appendChild(panel);
        
        console.debug('[BF-CSV2] Button-Panel erstellt');
    }
    
    /**
     * Erstellt einen Button
     * @param {String} text - Button-Text
     * @param {Function} onClick - Click-Handler
     * @param {Boolean} small - Kleiner Button
     * @returns {HTMLElement}
     */
    function createButton(text, onClick, small = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.onclick = onClick;
        button.style.cssText = `
            width: ${small ? '40px' : '100%'};
            padding: ${small ? '8px' : '10px 15px'};
            margin: 5px ${small ? '0' : '0'};
            background: white;
            color: #667eea;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: ${small ? '14px' : '14px'};
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        `;
        
        // Hover-Effekt
        button.onmouseenter = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        };
        button.onmouseleave = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        };
        
        return button;
    }
    
    /**
     * Zeigt eine Benachrichtigung an
     * @param {String} message - Nachricht
     * @param {String} type - Typ: 'success', 'error', 'warning', 'info'
     * @param {Number} duration - Dauer in ms
     */
    function showNotification(message, type = 'info', duration = 5000) {
        // Entferne alte Notification falls vorhanden
        const oldNotification = document.getElementById('bf-csv2-notification');
        if (oldNotification) {
            oldNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.id = 'bf-csv2-notification';
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            font-size: 14px;
            font-weight: 500;
            max-width: 400px;
            text-align: center;
            white-space: pre-line;
            animation: slideDown 0.3s ease;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-Hide
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    
    // (showSettings entfernt)
    
    /**
     * Berechnet CSS für Button-Position
     * @returns {String}
     */
    function getPositionCSS() {
        switch (CONFIG.BUTTON_POSITION) {
            case 'top-left':
                return 'top: 20px; left: 20px;';
            case 'top-right':
                return 'top: 20px; right: 20px;';
            case 'bottom-left':
                return 'bottom: 20px; left: 20px;';
            case 'bottom-right':
                return 'bottom: 20px; right: 20px;';
            default:
                return 'top: 20px; right: 20px;';
        }
    }
    
    // ===== ANIMATION CSS =====
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                transform: translateX(-50%) translateY(-100%);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            to {
                transform: translateX(-50%) translateY(-100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // ===== INITIALIZATION =====
    
    /**
     * Initialisiert das Skript
     */
    function init() {
        console.debug('[BF-CSV2] Initialisiere Tampermonkey-Skript...');
        
        // Warte bis Seite vollständig geladen ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createButtonPanel);
        } else {
            createButtonPanel();
        }
        
        console.debug('[BF-CSV2] Initialisierung abgeschlossen');
    }
    
    // Starte das Skript
    init();
    
})();

