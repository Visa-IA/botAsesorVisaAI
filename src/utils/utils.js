const OpenAI = require('openai');
// const { instructions } = require('./instrucciones_assista');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// Objeto para mantener seguimiento de los hilos activos
const activeThreads = {};

async function run(mensaje, numero) {
    try {
        // Verificar si ya existe un hilo para este número
        if (!activeThreads[numero]) {
            // Crear un nuevo hilo si no existe
            const thread = await openai.beta.threads.create({
                messages: [
                    {
                        role: "user",
                        content: mensaje,
                    },
                ],
            });
            // console.log("THREAD DE NUMERO NO EXISTE:",numero);
            // console.log(thread)

            // Guardar el ID del hilo en el objeto de hilos activos
            activeThreads[numero] = thread.id;
        } else {
            const threadMessages = await openai.beta.threads.messages.create(
                activeThreads[numero],
                { role: "user", content: mensaje }
            );
            // console.log("THREAD DE NUMERO EXISTE:",numero);
            // console.log(threadMessages);
        }

        // Obtener el ID del hilo activo para este número
        const threadId = activeThreads[numero];

        // Ejecutar y esperar la respuesta del hilo
        let run = await openai.beta.threads.runs.createAndPoll(threadId, {
            assistant_id: ASSISTANT_ID,
        });

        // Procesar la respuesta del hilo cuando esté completado
        if (run.status === 'completed') {
            const messages = await openai.beta.threads.messages.list(run.thread_id);
            for (const message of messages.data.reverse()) {
            //     // console.log("PARA EL NÚMERO",numero);
            //     //console.log(`${message.role} > ${message.content[0].text.value}`);
            }
            return messages.data[messages.data.length - 1].content[0].text.value;
        } else {
            console.log(run.status);
        }

    } catch (error) {
        console.error("HUBO UN ERROR CORRIENDO RUN:", error);
    }
}

module.exports = {
    run
};



// CREANDO UN ASISTENTE EN CASO DE NO EXISTIR
// const assistant = await openai.beta.assistants.create({
//     name: "visaAI",
//     instructions: instructions,
//     model: "gpt-3.5-turbo",
//     // temperature: ,
//     // top_p: 0.01,
//     // tools: [{ type: "file_search" }],
// });
// console.log(assistant);