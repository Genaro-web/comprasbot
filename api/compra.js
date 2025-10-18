// CORREGIDO /api/compra.js con CORS + Verificación de Origin

const fetch = require('node-fetch');

// --- CONFIGURACIÓN ---
const BOT_TOKEN = '8400863034:AAEi2nBsC79eawh5wX8NcMaRJPWWME35vEk'; // 👈 ¡PON TU TOKEN DE TELEGRAM AQUÍ!
const CHAT_ID = '737845666';     // 👈 ¡PON TU CHAT ID AQUÍ!
const EXPECTED_SCHEME = 'chrome-extension://'; 

module.exports = async (req, res) => {
    
    // --- ✅ 1. AÑADIR CABECERAS CORS ---
    // Permite que orígenes chrome-extension:// puedan hacer la petición
    const requestOrigin = req.headers.origin;
    
    // Ponemos la cabecera Allow-Origin de forma más específica si es posible
    // Si viene de una extensión, permite ESA extensión. Si no, permite cualquiera ('*') temporalmente
    // para que la verificación de abajo funcione. '*' es necesario para que el navegador no bloquee
    // la petición ANTES de que llegue a nuestra lógica de verificación.
    res.setHeader('Access-Control-Allow-Origin', requestOrigin && requestOrigin.startsWith(EXPECTED_SCHEME) ? requestOrigin : '*');
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); 
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); 

    // Manejo de peticiones OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    // --- FIN CABECERAS CORS ---

    // --- ✅ 2. VERIFICACIÓN DE ORIGEN EN EL SERVIDOR ---
    console.log(`Request received. Origin: ${requestOrigin}`); 
    if (!requestOrigin || !requestOrigin.startsWith(EXPECTED_SCHEME)) {
        console.warn(`🚫 Forbidden request from non-extension origin: ${requestOrigin}`);
        // Rechaza si NO viene de una extensión
        return res.status(403).json({ success: false, message: "Solo se permiten peticiones desde la extensión autorizada." });
    }
    // --- FIN VERIFICACIÓN DE ORIGEN ---


    // 3. Extraemos los datos (si las verificaciones pasaron)
    const { cuentaBs, qtdComprada } = req.query;
    console.log(`   Data: Cuenta ${cuentaBs}, Monto ${qtdComprada}`);

    if (!cuentaBs || !qtdComprada) {
        return res.status(400).json({ success: false, message: 'Faltan datos en la solicitud' });
    }

    // 4. Creamos y enviamos el mensaje a Telegram
    const mensaje = `🎉 **¡Nueva Compra Realizada!** 🎉\n\n- **Cuenta:** ...${cuentaBs.slice(-6)}\n- **Monto Comprado:** ${qtdComprada} USD`;
    try {
        const urlTelegram = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const telegramResponse = await fetch(urlTelegram, { /* ... (resto del fetch a Telegram) ... */ });

        // ... (manejo de respuesta de Telegram) ...

        console.log('   Notificación enviada a Telegram con éxito.');
        res.status(200).json({ success: true, message: 'Notificación recibida y procesada.' });

    } catch (error) {
        console.error('   Error processing request:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// Asegúrate de completar la parte del fetch a Telegram como estaba antes:
// body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje, parse_mode: 'Markdown' })