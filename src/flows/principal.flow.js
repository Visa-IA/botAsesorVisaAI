const { addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const { run } = require('../utils/utils');

// Definir una variable para controlar si ya hay una solicitud en curso
let processingRequest = false;

const flowPrincipal = addKeyword(EVENTS.WELCOME).addAction(
    async (ctx, { flowDynamic, state, fallBack, provider }) => {
        const numero = ctx.from;
        const jid = ctx.key.remoteJid;
        const refProvider = provider.getInstance();

        refProvider.presenceSubscribe(jid);
        await refProvider.sendPresenceUpdate("composing", jid);

        // Función para manejar la solicitud actual
        const handleRequest = async () => {
            try {
                processingRequest = true;

                // Ejecutar la solicitud
                const response = await run(ctx.body, numero);
                const chunks = response.split(/\n\n+/);
                for (const chunk of chunks) {
                    await flowDynamic([{ body: chunk.trim() }]);
                }
            } catch (error) {
                console.error('Error processing request:', error);
            } finally {
                processingRequest = false;
            }
        };

        // Si ya hay una solicitud en curso, esperar a que termine antes de manejar la nueva solicitud
        if (processingRequest) {
            // Puedes decidir cómo manejar múltiples solicitudes en espera, como enviar un mensaje de ocupado o ignorar la solicitud
            console.log('Ya hay una solicitud en curso, por favor espera.',ctx.from);
            await flowDynamic("Hola por favor envia mensaje en unos minutos actualmente tenemos muchas solicitudes.")
            return;
        }

        // Manejar la solicitud actual
        await handleRequest();
    }
);

module.exports = { flowPrincipal };




