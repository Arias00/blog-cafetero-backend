// backend/controllers/reportController.js

const db = require('../models/db');
const axios = require('axios');


// =======================================================================
//   OBTIENE EL ÚLTIMO INFORME PARA MOSTRAR EN EL PANEL PÚBLICO
// =======================================================================
exports.getLatestReport = async (req, res) => {
    try {
        // --- 1. OBTENER EL INFORME MANUAL DE NUESTRA BASE DE DATOS ---
        const reportQuery = `SELECT * FROM market_reports ORDER BY report_date DESC LIMIT 1`;
        const [reports] = await db.query(reportQuery);

        // Creamos un objeto base con los datos del informe, o con valores por defecto si no hay ninguno
        // ¡AJUSTADO! Aseguramos que reportData contenga todos los campos de la DB, incluyendo price_ny
        let reportDataFromDB = reports.length > 0 ? reports[0] : {
            report_date: null, // Para que no falle si no hay informes
            price_ny: null,
            price_fnc: null,
            production_info: null,
            exports_info: null
        };

        // --- 2. OBTENER DATOS EN TIEMPO REAL DE YAHOO FINANCE ---
        // ... (tu código de Yahoo Finance se queda igual) ...
        const yahooUrl_current = 'https://query1.finance.yahoo.com/v8/finance/chart/KC=F?range=1d&interval=15m';
        const yahooUrl_historical = 'https://query1.finance.yahoo.com/v8/finance/chart/KC=F?range=1y&interval=1d';
        
        let nysePriceData = { price: 'N/A', change: '', status: 'No disponible' };
        let historicalData = { labels: [], data: [] };

        const [yahooCurrentRes, yahooHistoricalRes] = await Promise.allSettled([
            axios.get(yahooUrl_current, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
            axios.get(yahooUrl_historical, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        ]);

        if (yahooCurrentRes.status === 'fulfilled' && yahooCurrentRes.value.data?.chart?.result?.[0]?.meta) {
            const meta = yahooCurrentRes.value.data.chart.result[0].meta;
            const priceNYRaw = meta.regularMarketPrice || meta.previousClose;
            if (priceNYRaw !== undefined) {
                nysePriceData.price = priceNYRaw.toFixed(2);
                nysePriceData.change = `${(meta.regularMarketChangePercent || 0).toFixed(2)}%`;
                nysePriceData.status = meta.regularMarketPrice ? "En Vivo" : "Al Cierre Anterior";
            }
        }
        if (yahooHistoricalRes.status === 'fulfilled' && yahooHistoricalRes.value.data?.chart?.result?.[0]) {
             const result = yahooHistoricalRes.value.data.chart.result[0];
             if (result.timestamp) {
                historicalData.labels = result.timestamp.map(ts => new Date(ts * 1000).toLocaleDateString());
                historicalData.data = result.indicators.quote[0].close.map(p => p ? p.toFixed(2) : null);
             }
        }

        // --- 3. DATOS SEMI-ESTÁTICOS ---
        const topExporters = [ /* ... tus datos de exportadores ... */ ]; // Asegúrate de que esto exista
        const colombiaRegions = ["Huila", "Antioquia", "Tolima", "Cauca", "Nariño"]; // Asegúrate de que esto exista

        // --- 4. ENVIAR LA RESPUESTA COMBINADA ---
        res.status(200).json({
            // ¡AJUSTADO! Incluimos el objeto completo del último reporte de la DB
            lastManualReport: reportDataFromDB, // ¡NUEVO! Aquí estarán todos los campos de tu DB

            // Datos en vivo de Yahoo Finance (si quieres mostrarlos en algún lado)
            currentNysePrice: { ...nysePriceData, unit: "USD por libra" }, // Renombrado para claridad
            historicalData: historicalData,

            // Los siguientes son redundantes si ya incluimos lastManualReport, pero se mantienen por si tu frontend los usa.
            colombiaPrice: { 
                price: reportDataFromDB.price_fnc, // Usamos el de la DB
                note: "Precio interno de referencia", 
                unit: "COP por carga (125kg)" 
            },
            economicIndicators: {
                production: reportDataFromDB.production_info,
                exports: reportDataFromDB.exports_info
            },
            
            // Datos estáticos
            topExporters,
            colombiaRegions,
        });

    } catch (error) {
        console.error("Error al obtener el informe combinado:", error);
        res.status(500).json({ message: 'Error en el servidor al obtener el informe.' });
    }
};

// =======================================================================
//   CREA UN NUEVO INFORME DESDE EL PANEL DE ADMINISTRACIÓN
// =======================================================================
exports.createReport = async (req, res) => {
    try {
        const { report_date, price_ny, price_fnc, production_info, exports_info } = req.body;

        // Validación simple para los campos obligatorios
        if (!report_date || !price_ny || !price_fnc) {
            return res.status(400).json({ message: 'La fecha y los precios de NY y FNC son obligatorios.' });
        }

        const query = `
            INSERT INTO market_reports (report_date, price_ny, price_fnc, production_info, exports_info) 
            VALUES (?, ?, ?, ?, ?)
        `;

        await db.query(query, [report_date, price_ny, price_fnc, production_info, exports_info]);

        res.status(201).json({ message: 'Informe de mercado guardado exitosamente.' });

    } catch (error) {
        console.error("Error al crear el informe:", error);
        res.status(500).json({ message: 'Error en el servidor al guardar el informe.' });
    }
};

// =======================================================================
//   ¡NUEVO! OBTIENE TODOS LOS INFORMES PARA EL DASHBOARD
// =======================================================================
exports.getAllReports = async (req, res) => {
    try {
        const reportQuery = `SELECT * FROM market_reports ORDER BY report_date DESC`;
        const [reports] = await db.query(reportQuery);
        res.status(200).json(reports);
    } catch (error) {
        console.error("Error al obtener todos los informes:", error);
        res.status(500).json({ message: 'Error en el servidor al obtener los informes.' });
    }
};

// =======================================================================
//   ¡NUEVO! ELIMINA UN INFORME POR ID
// =======================================================================
exports.deleteReport = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `DELETE FROM market_reports WHERE id = ?`;
        const [result] = await db.query(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Informe no encontrado.' });
        }
        res.status(200).json({ message: 'Informe eliminado exitosamente.' });
    } catch (error) {
        console.error("Error al eliminar el informe:", error);
        res.status(500).json({ message: 'Error en el servidor al eliminar el informe.' });
    }
};