// ACTUALIZADO /api/compra.js para escribir en Firebase

const fetch = require('node-fetch');
const admin = require('firebase-admin');

// --- CONFIGURACIÓN ---
const BOT_TOKEN = '8400863034:AAEi2nBsC79eawh5wX8NcMaRJPWWME35vEk'; // 👈 ¡TU NUEVO TOKEN DE TELEGRAM!
const CHAT_ID = '737845666';           // 👈 Tu Chat ID
const EXPECTED_SCHEME = 'chrome-extension://';

// Lista de todas las cuentas (DEBE coincidir con background.js)
const TODAS_LAS_CUENTAS = ['438797', '361275', '013286', '063191', '037647', '256798', '066879', '046998', '054881', '054569', '183117'];

// --- Inicializar Firebase Admin SDK ---
// Hacemos esto UNA SOLA VEZ fuera del handler para eficiencia
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('[LOG] Firebase Admin SDK inicializado.');
  } catch (e) {
    console.error('[ERROR] Falló la inicialización de Firebase Admin SDK:', e);
    // Si falla la inicialización, las escrituras a Firebase no funcionarán.
  }
}
// ------------------------------------

module.exports = async (req, res) => {
    
    // --- Cabeceras CORS y Verificación de Origin (como antes) ---
    const requestOrigin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', requestOrigin && requestOrigin.startsWith(EXPECTED_SCHEME) ? requestOrigin : '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); 
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); 
    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    console.log(`[LOG] Request received. Origin: ${requestOrigin}`); 
    if (!requestOrigin || !requestOrigin.startsWith(EXPECTED_SCHEME)) {
        console.warn(`[WARN] Forbidden request from non-extension origin: ${requestOrigin}`);
        return res.status(403).json({ success: false, message: "Solo se permiten peticiones desde la extensión autorizada." });
    }
    // --- Fin Verificaciones ---

    // --- Extracción de Datos ---
    const { cuentaBs, qtdComprada } = req.query;
    console.log(`[LOG] Data: Cuenta ${cuentaBs}, Monto ${qtdComprada}`);
    if (!cuentaBs || !qtdComprada) {
        return res.status(400).json({ success: false, message: 'Faltan datos en la solicitud' });
    }
    // --- Fin Extracción ---

    let telegramSent = false;
    let firebaseTriggered = false;

    // --- 1. Envío a Telegram (Intentar primero) ---
    try {
        const mensaje = `✅ Compra Cliente: ...${cuentaBs.slice(-6)} (${qtdComprada} USD)`; // Mensaje más corto
        const urlTelegram = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const telegramPayload = { chat_id: CHAT_ID, text: mensaje }; // Texto plano

        console.log(`[LOG] Enviando a Telegram...`);
        const telegramResponse = await fetch(urlTelegram, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(telegramPayload)
        });
        const tgResponseBody = await telegramResponse.text(); // Leer siempre el cuerpo
        console.log(`[LOG] Telegram Response - Status: ${telegramResponse.status}, Body: ${tgResponseBody}`);
        if (!telegramResponse.ok) {
            throw new Error(`Telegram API failed (${telegramResponse.status}): ${tgResponseBody}`);
        }
        telegramSent = true;
        console.log('[LOG] Notificación enviada a Telegram.');

    } catch (error) {
        console.error('[ERROR] Falló el envío a Telegram:', error);
        // NO detenemos el proceso aquí, aún intentaremos activar Firebase
    }
    // --- Fin Envío a Telegram ---


    // --- 2. Disparar RÁFAGA de Señales en Firebase para OTRAS cuentas ---
    if (admin.apps.length > 0) { // Solo intentar si el SDK inicializó bien
        try {
            const db = admin.database();
            const cuentaQueCompro = cuentaBs;
            const cuentasAActivar = TODAS_LAS_CUENTAS.filter(c => c !== cuentaQueCompro);

            if (cuentasAActivar.length > 0) { // Solo si hay otras cuentas
                console.log(`[LOG] Cuenta que compró: ${cuentaQueCompro}`);
                console.log(`[LOG] Iniciando RÁFAGA de señales para ${cuentasAActivar.length} otras cuentas...`);

                // Calcular duración aleatoria entre 5000ms (5s) y 10000ms (10s)
                const minDuracion = 10000;
                const maxDuracion = 10000;
                const duracionRafaga = Math.floor(Math.random() * (maxDuracion - minDuracion + 1)) + minDuracion;
                const intervaloSenal = 500; // Enviar señal cada 500ms
                const numSenales = Math.ceil(duracionRafaga / intervaloSenal);
                let senalesEnviadasConExito = 0;

                console.log(`[LOG]   Duración: ${duracionRafaga / 1000}s, Intervalo: ${intervaloSenal}ms, Señales a enviar: ${numSenales}`);

                const sendSignalPromises = [];

                for (let i = 0; i < numSenales; i++) {
                    const delay = i * intervaloSenal;
                    // Programar el envío de la señal con un retardo
                    sendSignalPromises.push(
                        new Promise(resolve => setTimeout(async () => {
                            try {
                                const signalTime = Date.now() + i; // Timestamp ligeramente diferente para asegurar cambio
                                const signalData = { mensaje: "activar_clic", timestamp: signalTime };
                                
                                // Crea un objeto para actualizaciones múltiples (más eficiente)
                                const updates = {};
                                cuentasAActivar.forEach(cuenta => {
                                    updates[`senales/${cuenta}`] = signalData;
                                });

                                // Realiza la escritura múltiple en Firebase
                                await db.ref().update(updates);

                                senalesEnviadasConExito++;
                                console.log(`[LOG]   Ráfaga: Señal ${i + 1}/${numSenales} enviada OK.`);
                                resolve(true); // Señal enviada
                            } catch (signalError) {
                                console.error(`[ERROR] Ráfaga: Error enviando señal ${i + 1}:`, signalError.message);
                                resolve(false); // Falló el envío de esta señal
                            }
                        }, delay))
                    );
                }

                // Esperar a que todas las señales programadas se envíen
                await Promise.all(sendSignalPromises);
                firebaseTriggered = senalesEnviadasConExito > 0;
                console.log(`[LOG] Ráfaga de señales completada. ${senalesEnviadasConExito} sets enviados con éxito.`);
            } else {
                 console.log('[LOG] No hay otras cuentas para activar.');
                 firebaseTriggered = true; // Considerar éxito si no había nada que hacer
            }

        } catch (error) {
            console.error('[ERROR] Falló el proceso de ráfaga de señales a Firebase:', error);
            firebaseTriggered = false; // Marcar como fallido si hay error general
        }
    } else {
         console.error('[ERROR] Firebase Admin SDK no está inicializado. No se enviaron señales.');
         firebaseTriggered = false;
    }
    // --- Fin Disparo Firebase ---

    // --- Respuesta Final ---
    // Respondemos éxito general si al menos Telegram o Firebase funcionó (o ambos).
    // Podrías ajustar esta lógica si necesitas más detalle en la respuesta.
    if (telegramSent || firebaseTriggered) {
        res.status(200).json({ 
            success: true, 
            message: 'Proceso completado.', 
            telegram: telegramSent ? 'OK' : 'Failed', 
            firebase_triggers: firebaseTriggered ? `OK (${TODAS_LAS_CUENTAS.length - 1} signals)` : 'Failed' 
        });
    } else {
        // Si ambos fallaron
        res.status(500).json({ 
            success: false, 
            message: 'Fallaron tanto Telegram como Firebase.', 
            telegram: 'Failed', 
            firebase_triggers: 'Failed' 
        });
    }
};
