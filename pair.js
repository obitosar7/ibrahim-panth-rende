const express = require('express');
const fs = require('fs');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, delay } = require('@whiskeysockets/baileys');
const { makeid } = require('./id'); // مولد ID عشوائي

const router = express.Router();

function removeFile(path) {
  if (fs.existsSync(path)) fs.rmSync(path, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
  const number = (req.query.number || '').replace(/[^0-9]/g, '');
  if (!number) return res.status(400).json({ error: 'رقم غير صحيح' });

  const id = makeid();
  const path = './temp/' + id;

  const { state, saveCreds } = await useMultiFileAuthState(path);

  try {
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Chrome', '', ''],
    });

    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(number);
      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          const credsPath = `${path}/creds.json`;
          if (fs.existsSync(credsPath)) {
            const data = fs.readFileSync(credsPath);
            const b64 = Buffer.from(data).toString('base64');
            res.json({ code, session: b64 });
            await delay(1000);
            await sock.ws.close();
            removeFile(path);
          }
        }
      });

      // Send pairing code immediately
      if (!res.headersSent) res.json({ code });
    } else {
      res.json({ error: 'الحساب مسجل بالفعل' });
    }
  } catch (err) {
    console.error(err);
    removeFile(path);
    if (!res.headersSent) res.json({ error: 'خطأ أثناء محاولة الاتصال' });
  }
});

module.exports = router;
