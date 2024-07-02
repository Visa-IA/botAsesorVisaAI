require('dotenv').config();
// process.env.GOOGLE_APPLICATION_CREDENTIALS = 'path/to/your/credentials.json';
const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const Queue = require('queue-promise');
const mimeType = require('mime-types');
const fs = require('node:fs/promises');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const ServerHttp = require('./src/http');
const ChatwootClass = require('./src/chatwoot/chatwoot.class');
const { handlerMessage } = require('./src/chatwoot');
const { EVENTS } = require('@bot-whatsapp/bot');

const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

const PORT = process.env.PORT ?? 3001

const welcomeflow = addKeyword(EVENTS.WELCOME).addAnswer('Hola, soy un bot de WhatsApp. Por favor envia una imagen para analizarla.');

const flowPrincipal = addKeyword(EVENTS.MEDIA)
    .addAnswer('He recibido y justo ahora estoy consultando la información, por favor espera un momento.', null, async (ctx, { flowDynamic }) => {
        const numeroDeWhatsapp = ctx.from;
        if (ctx?.body.includes('_event_')) {
            const mime = ctx?.message?.imageMessage?.mimetype ?? ctx?.message?.videoMessage?.mimetype ?? ctx?.message?.documentMessage?.mimetype;
            const extension = mimeType.extension(mime);
            const buffer = await downloadMediaMessage(ctx, "buffer");
            const fileName = `${numeroDeWhatsapp}file-${Date.now()}.${extension}`;
            const pathFile = `${process.cwd()}/public/${fileName}`;
            await fs.writeFile(pathFile, buffer);
            console.log(`[FICHERO POR USUARIO] http://localhost:3001/${fileName}`);

            // Enviar la imagen a Google Cloud Vision y obtener las etiquetas
            try {
                console.log('Analizando imagen:', pathFile);
                const [result] = await client.labelDetection(pathFile);
                const labels = result.labelAnnotations.map(label => label.description);
                console.log('Labels:', labels);

                // Responder con las etiquetas obtenidas
                const etiquetas = labels.join(', ');
                await flowDynamic(`He encontrado las siguientes etiquetas en la imagen: ${etiquetas}`);
            } catch (error) {
                console.error('Error al analizar la imagen:', error);
                await flowDynamic('Ocurrió un error al analizar la imagen. Por favor, intenta nuevamente.');
            }
        }
    });

const serverHttp = new ServerHttp(PORT)

const chatwoot = new ChatwootClass({
    account: process.env.CHATWOOT_ACCOUNT_ID,
    token: process.env.CHATWOOT_TOKEN,
    endpoint: process.env.CHATWOOT_ENDPOINT
})

const queue = new Queue({
    concurrent: 1,
    interval: 500
})

const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal,welcomeflow])
    const adapterProvider = createProvider(BaileysProvider)

    const bot = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    serverHttp.initialization(bot)

    /**
     * Los mensajes entrantes al bot (cuando el cliente nos escribe! <---)
     */

    adapterProvider.on('message', (payload) => {
        // console.log('payload', payload)
        queue.enqueue(async () => {

            try {

                const attachment = []
                /**
                 * Determinar si el usuario esta enviando una imagen o video o fichero
                 * luego puedes ver los fichero en http://localhost:3001/file.pdf o la extension
                 */
                if (payload?.body.includes('_event_')) {
                    const mime = payload?.message?.imageMessage?.mimetype ?? payload?.message?.videoMessage?.mimetype ?? payload?.message?.documentMessage?.mimetype;
                    const extension = mimeType.extension(mime);
                    const buffer = await downloadMediaMessage(payload, "buffer");
                    const fileName = `file-${Date.now()}.${extension}`
                    const pathFile = `${process.cwd()}/public/${fileName}`
                    await fs.writeFile(pathFile, buffer);
                    console.log(`[FIECHERO CREADO] http://localhost:3001/${fileName}`)
                    attachment.push(pathFile)
                }

                await handlerMessage({
                    phone: payload.from,
                    name: payload.pushName,
                    message: payload.body,
                    attachment,
                    mode: 'incoming'
                }, chatwoot)
            } catch (err) {
                console.log('ERROR', err)
            }
        });
    })

    /**
     * Los mensajes salientes (cuando el bot le envia un mensaje al cliente ---> )
     */
    bot.on('send_message', (payload) => {
        queue.enqueue(async () => {
            await handlerMessage({
                phone: payload.numberOrId,
                name: payload.pushName,
                message: payload.answer,
                mode: 'outgoing'
            }, chatwoot)
        })
    })
}

main()
