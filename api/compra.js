// Este es el contenido para el archivo /api/compra.js

// Importamos 'node-fetch' para hacer la llamada a la API de Telegram
const fetch = require('node-fetch');

// ¡IMPORTANTE! Reemplaza estos valores con los tuyos
const BOT_TOKEN = '8400863034:AAEi2nBsC79eawh5wX8NcMaRJPWWME35vEk'; // El token de tu bot de Telegram
const CHAT_ID = '737845666'; // Tu ID de chat de Telegram

module.exports = async (req, res) => {
    // 1. Extraemos los datos que la extensión nos envía en la URL
    const { cuentaBs, qtdComprada } = req.query;

    console.log(`Notificación recibida: Cuenta ${cuentaBs}, Monto ${qtdComprada}`);

    // Verificamos que los datos llegaron
    if (!cuentaBs || !qtdComprada) {
        return res.status(400).send('Faltan datos en la solicitud');
    }

    // 2. Creamos el mensaje que queremos recibir
    const mensaje = `🎉 **¡Nueva Compra Realizada!** 🎉\n\n- **Cuenta:** ...${cuentaBs.slice(-6)}\n- **Monto Comprado:** ${qtdComprada} USD`;

    // 3. Enviamos el mensaje a nuestro chat de Telegram
    try {
        const urlTelegram = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        await fetch(urlTelegram, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: mensaje,
                parse_mode: 'Markdown'
            })
        });

        console.log('Notificación enviada a Telegram con éxito.');
        
        // 4. Respondemos a la extensión que todo salió bien
        res.status(200).send('Notificación recibida y procesada.');

    } catch (error) {
        console.error('Error al enviar la notificación a Telegram:', error);
        res.status(500).send('Error interno del servidor.');
    }
};