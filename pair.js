const PastebinAPI = require('pastebin-js'),
pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL')
const {makeid} = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
const {
    default: France_King,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("maher-zubair-baileys");

function removeFile(FilePath){
    if(!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true })
};

// صفحة HTML لو مفيش رقم واتساب
router.get('/', (req, res, next) => {
    if (!req.query.number) {
        res.send(`
            <html>
            <head><title>Pair Code</title></head>
            <body style="font-family:sans-serif;text-align:center;margin-top:40px">
                <h2>ادخل رقم الواتساب للحصول على كود الاقتران</h2>
                <form onsubmit="event.preventDefault(); getCode();">
                    <input type="text" id="number" placeholder="مثال: +201234567890" style="padding:8px;width:250px"/>
                    <button type="submit" style="padding:8px 15px">احصل على الكود</button>
                </form>
                <div id="result" style="margin-top:20px;font-weight:bold;"></div>
                <script>
                    async function getCode() {
                        const number = document.getElementById('number').value;
                        const res = await fetch('/pair?number=' + encodeURIComponent(number));
                        const data = await res.json();
                        if (data.code) {
                            document.getElementById('result').innerText = "كود الاقتران: " + data.code;
                        } else {
                            document.getElementById('result').innerText = "فشل في الحصول على الكود";
                        }
                    }
                </script>
            </body>
            </html>
        `);
    } else {
        next();
    }
});

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function FLASH_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/'+id);
        try {
            let Pair_Code_By_France_King = France_King({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "fatal"}).child({level: "fatal"}),
                browser: ["Chrome (Linux)", "", ""]
            });

            if (!Pair_Code_By_France_King.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g,'');
                const code = await Pair_Code_By_France_King.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({code});
                }
            }

            Pair_Code_By_France_King.ev.on('creds.update', saveCreds);
            Pair_Code_By_France_King.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection == "open") {
                    await delay(5000);
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    await delay(800);
                    let b64data = Buffer.from(data).toString('base64');
                    let session = await Pair_Code_By_France_King.sendMessage(Pair_Code_By_France_King.user.id, { text: ''+ b64data });

                    let FLASH_MD_TEXT = `
*𝕰𝖊𝖊𝖞... 𝖙𝖔𝖕𝖚 𝖉𝖒𝖍 𝖍𝖆𝖘 𝖏𝖚𝖘𝖙 𝖈𝖔𝖓𝖓𝖊𝖈𝖙𝖊𝖉 𝖙𝖍𝖊 𝖘𝖊𝖘𝖘𝖎𝖔𝖓 𝖎𝖉*
*Wow you choosen TOPU-MD complete the deployment and enyoy the speed*
____________________________________
╔════◇
║『 *TOPU AI IS READY TO DEPLOY』
║ YOUR SESSION IS READY. COPY IT  
║ AND HOST IT ON YOUR WEB.
╚════════════════════╝
╔═════◇
║ 『••• OWNER INFO •••』

║ ❒ 𝐎wner: _https://wa.me/message/5WRTCPHFKUGFM1_

║ ❒ 𝐑𝐞𝐩𝐨: _https://github.com/Toputech/Topu-ai_

║ ❒ 𝐖𝐚𝐆𝐫𝐨𝐮𝐩: _https://chat.whatsapp.com/BxelCdrHnDYBNfMy2jafgI_

║ ❒ 𝐖𝐚𝐂𝐡𝐚𝐧𝐧𝐞𝐥: _https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r_
║ 
╚════════════════════╝ 
 *©TOPU TECH*
___________________________________

Don't Forget To Give Star To My Repo_`

                    await Pair_Code_By_France_King.sendMessage(Pair_Code_By_France_King.user.id,{text:FLASH_MD_TEXT},{quoted:session})
                    await delay(100);
                    await Pair_Code_By_France_King.ws.close();
                    return await removeFile('./temp/'+id);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    FLASH_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log("service restated");
            await removeFile('./temp/'+id);
            if (!res.headersSent) {
                await res.send({code:"Service is Currently Unavailable"});
            }
        }
    }

    return await FLASH_MD_PAIR_CODE();
});

module.exports = router;
