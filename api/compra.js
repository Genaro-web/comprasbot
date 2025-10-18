// CORREGIDO /api/compra.js ENVIANDO TEXTO PLANO

const fetch = require('node-fetch');

// --- CONFIGURACIÓN ---
// *** ¡ASEGÚRATE DE USAR TU NUEVO TOKEN REVOCADO Y REGENERADO AQUÍ! ***
const BOT_TOKEN = '8400863034:AAEi2nBsC79eawh5wX8NcMaRJPWWME35vEk'; // 👈 ¡PON TU NUEVO TOKEN DE TELEGRAM AQUÍ!
const CHAT_ID = '737845666';        // 👈 Tu Chat ID

const EXPECTED_SCHEME = 'chrome-extension://'; 

module.exports = async (req, res) => {
    
    // --- Cabeceras CORS ---
    const requestOrigin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', requestOrigin && requestOrigin.startsWith(EXPECTED_SCHEME) ? requestOrigin : '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); 
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); 
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    // --- Fin CORS ---

    // --- Verificación de Origin ---
    console.log(`[LOG] Request received. Origin: ${requestOrigin}`); 
    if (!requestOrigin || !requestOrigin.startsWith(EXPECTED_SCHEME)) {
        console.warn(`[WARN] Forbidden request from non-extension origin: ${requestOrigin}`);
        return res.status(403).json({ success: false, message: "Solo se permiten peticiones desde la extensión autorizada." });
    }
    // --- Fin Verificación ---

    // --- Extracción de Datos ---
    const { cuentaBs, qtdComprada } = req.query;
    console.log(`[LOG] Data: Cuenta ${cuentaBs}, Monto ${qtdComprada}`);
    if (!cuentaBs || !qtdComprada) {
        return res.status(400).json({ success: false, message: 'Faltan datos en la solicitud' });
    }
    // --- Fin Extracción ---

    // --- Envío a Telegram ---
    // Mensaje sin formato Markdown
    const mensaje = `🎉 ¡Nueva Compra Realizada! 🎉\n\n- Cuenta: ...${cuentaBs.slice(-6)}\n- Monto Comprado: ${qtdComprada} USD`;
    
    const urlTelegram = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const telegramPayload = {
        chat_id: CHAT_ID,
        text: mensaje
        // Sin parse_mode, Telegram lo tratará como texto plano
    };

    console.log(`[LOG] Preparando envío a Telegram (texto plano): ${urlTelegram}`);
    console.log(`[LOG] Payload para Telegram: ${JSON.stringify(telegramPayload)}`);

    try {
        const telegramResponse = await fetch(urlTelegram, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(telegramPayload)
        });

        const responseStatus = telegramResponse.status;
        const responseBodyText = await telegramResponse.text(); 
        console.log(`[LOG] Respuesta de Telegram - Status: ${responseStatus}`);
        console.log(`[LOG] Respuesta de Telegram - Body: ${responseBodyText}`);

        if (!telegramResponse.ok) { 
            console.error(`[ERROR] Falló el envío a Telegram. Status: ${responseStatus}, Body: ${responseBodyText}`);
            throw new Error(`Telegram API responded with status ${responseStatus}: ${responseBodyText}`);
        }
        
        console.log('[LOG] Notificación enviada a Telegram (Status 2xx recibido).');
        res.status(200).json({ success: true, message: 'Notificación recibida y procesada.' });

    } catch (error) {
        console.error('[ERROR] Error durante el envío a Telegram o procesamiento:', error);
        res.status(500).json({ success: false, message: `Error interno del servidor: ${error.message}` });
    }
    // --- Fin Envío a Telegram ---
};