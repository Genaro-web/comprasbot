// Updated content for /api/compra.js with scheme check

const fetch = require('node-fetch');

// --- CONFIGURACI車N ---
const BOT_TOKEN = '8400863034:AAEi2nBsC79eawh5wX8NcMaRJPWWME35vEk'; // ?? ?PON TU TOKEN DE TELEGRAM AQU赤!
const CHAT_ID = '737845666';     // ?? ?PON TU CHAT ID AQU赤!
const EXPECTED_SCHEME = 'chrome-extension://'; // We check if the origin STARTS with this

module.exports = async (req, res) => {
    
    // --- ? 1. VERIFICACI車N DE ORIGEN (POR ESQUEMA) ---
    const requestOrigin = req.headers.origin; // Obtiene la cabecera Origin
    console.log(`Request received. Origin: ${requestOrigin}`); 

    // Check if origin exists and starts with the expected scheme
    if (!requestOrigin || !requestOrigin.startsWith(EXPECTED_SCHEME)) {
        console.warn(`?? Forbidden request from origin: ${requestOrigin}`);
        // If the origin doesn't start with chrome-extension://, reject it
        return res.status(403).json({ success: false, message: "Solo se permiten peticiones desde la extensi車n autorizada." });
    }
    // --- FIN DE LA VERIFICACI車N ---

    // 2. Extraemos los datos (si la verificaci車n pas車)
    const { cuentaBs, qtdComprada } = req.query;
    console.log(`   Data: Cuenta ${cuentaBs}, Monto ${qtdComprada}`);

    if (!cuentaBs || !qtdComprada) {
        return res.status(400).json({ success: false, message: 'Faltan datos en la solicitud' });
    }

    // 3. Creamos y enviamos el mensaje a Telegram
    const mensaje = `?? **?Nueva Compra Realizada!** ??\n\n- **Cuenta:** ...${cuentaBs.slice(-6)}\n- **Monto Comprado:** ${qtdComprada} USD`;
    try {
        const urlTelegram = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const telegramResponse = await fetch(urlTelegram, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: mensaje,
                parse_mode: 'Markdown'
            })
        });

        if (!telegramResponse.ok) {
            const errorBody = await telegramResponse.text();
            console.error(`Error sending to Telegram: ${telegramResponse.status} ${errorBody}`);
            throw new Error('Failed to send Telegram notification');
        }

        console.log('   Notificaci車n enviada a Telegram con 谷xito.');
        
        // 4. Respondemos a la extensi車n que todo sali車 bien
        res.status(200).json({ success: true, message: 'Notificaci車n recibida y procesada.' });

    } catch (error) {
        console.error('   Error processing request:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};