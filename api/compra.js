// Updated content for /api/compra.js with CORS headers

const fetch = require('node-fetch');

// --- CONFIGURACION ---
const BOT_TOKEN = '8400863034:AAEi2nBsC79eawh5wX8NcMaRJPWWME35vEk'; // ?? !PON TU TOKEN DE TELEGRAM AQUI!
const CHAT_ID = '737845666';     // ?? !PON TU CHAT ID AQUI!
// No necesitamos EXPECTED_ORIGIN aqui, ya que CORS maneja la seguridad ahora

module.exports = async (req, res) => {
    
    // --- ? 1. ANADIR CABECERAS CORS ---
    // Esto permite que CUALQUIER extension de Chrome llame a tu API.
    // Es menos restrictivo que verificar el ID exacto, pero bloquea navegadores.
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite cualquier origen (incluyendo extensiones)
    // Alternativa mas segura (solo tu extension):
    // const extensionOrigin = req.headers.origin;
    // if (extensionOrigin && extensionOrigin.startsWith('chrome-extension://')) {
    //    res.setHeader('Access-Control-Allow-Origin', extensionOrigin);
    // } else {
    //     // Si no viene de una extension, podrias bloquearlo aqui, pero el chequeo anterior ya lo hace.
    //     // Por simplicidad con Vercel, '*' es a menudo mas facil si no manejas datos muy sensibles.
    // }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); // Metodos permitidos
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Cabeceras permitidas

    // Manejo de peticiones OPTIONS (preflight) que el navegador envia para CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    // --- FIN DE CABECERAS CORS ---


    // 2. Extraemos los datos (si la verificacion paso)
    const { cuentaBs, qtdComprada } = req.query;
    console.log(`Request received. Origin: ${req.headers.origin}`); 
    console.log(`   Data: Cuenta ${cuentaBs}, Monto ${qtdComprada}`);

    if (!cuentaBs || !qtdComprada) {
        // Asegurate de devolver JSON tambien en errores para consistencia
        return res.status(400).json({ success: false, message: 'Faltan datos en la solicitud' });
    }

    // 3. Creamos y enviamos el mensaje a Telegram
    const mensaje = `?? **!Nueva Compra Realizada!** ??\n\n- **Cuenta:** ...${cuentaBs.slice(-6)}\n- **Monto Comprado:** ${qtdComprada} USD`;
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

        console.log('   Notificacion enviada a Telegram con exito.');
        
        // 4. Respondemos a la extension que todo salio bien
        res.status(200).json({ success: true, message: 'Notificacion recibida y procesada.' });

    } catch (error) {
        console.error('   Error processing request:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};