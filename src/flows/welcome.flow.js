const { addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const { flowPrincipal } = require('./principal.flow'); // Asegúrate de tener este archivo configurado correctamente

const welcomeflow = addKeyword(EVENTS.WELCOME).addAnswer(" ", null, async (ctx, { gotoFlow }) => {

    const numero = ctx.from;
    console.log('consultando en base de datos si existe el numero registrado....');

    const ifExist = true;
    if (ifExist) {
        // Si existe lo enviamos al flujo de registrados..
        gotoFlow(flowPrincipal);
    } else {
        // Si NO existe lo enviamos al flujo de NO registrados..
        console.log('No existe el numero registrado');
    }

});

module.exports = { welcomeflow };