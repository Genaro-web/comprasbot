// ACTUALIZADO /api/compra.js con Notificaciones de Inicio/Fin de Ráfaga

const fetch = require('node-fetch');
const admin = require('firebase-admin');

// --- CONFIGURACIÓN ---
const BOT_TOKEN = 'YOUR_NEW_BOT_TOKEN'; // 👈 ¡TU NUEVO TOKEN DE TELEGRAM!
const CHAT_ID = '737845666';           // 👈 Tu Chat ID
const EXPECTED_SCHEME = 'chrome-extension://';
const TODAS_LAS_CUENTAS = ['438797', '361275', '013286', '063191', '037647', '256798', '066879', '046998', '054881', '054569', '183117', '055097']; // Debe coincidir con background.js

// --- Inicializar Firebase Admin SDK ---
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('[LOG] Firebase Admin SDK inicializado.');
  } catch (e) { console.error('[ERROR] Falló la inicialización de Firebase Admin SDK:', e); }
}
// ------------------------------------

// --- Función Auxiliar para Enviar a Telegram ---
async function sendTelegramMessage(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[WARN] BOT_TOKEN o CHAT_ID no configurados. No se puede enviar a Telegram.');
    return false;
  }
  const urlTelegram = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const telegramPayload = { chat_id: CHAT_ID, text: text }; // Sin parse_mode

  try {
    console.log(`[LOG] Enviando a Telegram: "${text}"`);
    const response = await fetch(urlTelegram, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload)
    });
    const responseBody = await response.text();
    if (!response.ok) {
      throw new Error(`Status ${response.status}: ${responseBody}`);
    }
    console.log('[LOG] Mensaje enviado a Telegram.');
    return true;
  } catch (error) {
    console.error('[ERROR] Falló el envío a Telegram:', error.message);
    return false;
  }
}
// ------------------------------------------


module.exports = async (req, res) => {
    
    // --- Cabeceras CORS y Verificación de Origin ---
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

    let initialTelegramSent = false;
    let firebaseBurstStarted = false;
    let firebaseBurstFinished = false;
    let finalTelegramSent = false;
    let successfulSignals = 0;

    // --- 1. Notificación INICIAL de Compra a Telegram ---
    const compraMsg = `✅ Compra Cliente: ...${cuentaBs.slice(-6)} (${qtdComprada} USD)`;
    initialTelegramSent = await sendTelegramMessage(compraMsg); // Usamos la función auxiliar
    // --- Fin Notificación Inicial ---


    // --- 2. Disparar RÁFAGA de Señales en Firebase ---
    if (admin.apps.length > 0) { 
        try {
            const db = admin.database();
            const cuentaQueCompro = cuentaBs;
            const cuentasAActivar = TODAS_LAS_CUENTAS.filter(c => c !== cuentaQueCompro);

            if (cuentasAActivar.length > 0) {
                firebaseBurstStarted = true; // Marcamos que la ráfaga va a empezar
                const startMsg = `🚀 Iniciando ráfaga de señales para ${cuentasAActivar.length} cuentas (causada por ...${cuentaQueCompro.slice(-6)}).`;
                await sendTelegramMessage(startMsg); // *** Notifica Inicio de Ráfaga ***

                const minDuracion = 5000;
                const maxDuracion = 10000;
                const duracionRafaga = Math.floor(Math.random() * (maxDuracion - minDuracion + 1)) + minDuracion;
                const intervaloSenal = 500; 
                const numSenales = Math.ceil(duracionRafaga / intervaloSenal);
                
                console.log(`[LOG] Ráfaga: Duración ${duracionRafaga/1000}s, ${numSenales} señales para ${cuentasAActivar.length} cuentas.`);

                const sendSignalPromises = [];
                for (let i = 0; i < numSenales; i++) {
                    const delay = i * intervaloSenal;
                    sendSignalPromises.push(
                        new Promise(resolve => setTimeout(async () => {
                            try {
                                const signalTime = Date.now() + i; 
                                const signalData = { mensaje: "activar_clic", timestamp: signalTime };
                                const updates = {};
                                cuentasAActivar.forEach(cuenta => { updates[`senales/${cuenta}`] = signalData; });
                                await db.ref().update(updates);
                                successfulSignals++; // Contamos éxito solo aquí
                                console.log(`[LOG]   Ráfaga: Señal ${i + 1}/${numSenales} enviada OK.`);
                                resolve(true); 
                            } catch (signalError) {
                                console.error(`[ERROR] Ráfaga: Error enviando señal ${i + 1}:`, signalError.message);
                                resolve(false); 
                            }
                        }, delay))
                    );
                }

                await Promise.all(sendSignalPromises);
                firebaseBurstFinished = true; // Marcamos que la ráfaga terminó
                const endMsg = `🏁 Ráfaga completada. ${successfulSignals} sets de señales enviados con éxito.`;
                await sendTelegramMessage(endMsg); // *** Notifica Fin de Ráfaga ***
                finalTelegramSent = true; // Marcamos que se envió el mensaje final
                console.log(`[LOG] Ráfaga de señales completada. ${successfulSignals} sets enviados.`);

            } else {
                 console.log('[LOG] No hay otras cuentas para activar.');
                 firebaseBurstStarted = true; // No hay ráfaga, pero el proceso continúa
                 firebaseBurstFinished = true; // Se considera completado
            }
        } catch (error) {
            console.error('[ERROR] Falló el proceso de ráfaga de señales a Firebase:', error);
            firebaseBurstFinished = false; // Marcar como fallido si hay error general
             // Intentar notificar error si es posible
            await sendTelegramMessage(`⚠️ Error al procesar ráfaga Firebase: ${error.message}`);
            finalTelegramSent = true;
        }
    } else {
         console.error('[ERROR] Firebase Admin SDK no está inicializado. No se enviaron señales.');
         firebaseBurstFinished = false;
         await sendTelegramMessage(`⚠️ Error crítico: Firebase Admin SDK no inicializado en el servidor.`);
         finalTelegramSent = true;
    }
    // --- Fin Disparo Firebase ---

    // --- Respuesta Final a la extensión original ---
    if (firebaseBurstFinished) { // Si la ráfaga (o la ausencia de ella) terminó bien
        res.status(200).json({ 
            success: true, 
            message: 'Proceso completado.', 
            initial_telegram: initialTelegramSent ? 'OK' : 'Failed', 
            firebase_burst: firebaseBurstStarted ? `OK (${successfulSignals} signals sent)` : 'N/A' 
        });
    } else { // Si algo falló en la ráfaga
        res.status(500).json({ 
            success: false, 
            message: 'Falló el proceso de ráfaga de Firebase.', 
            initial_telegram: initialTelegramSent ? 'OK' : 'Failed',
            firebase_burst: 'Failed' 
        });
    }
};