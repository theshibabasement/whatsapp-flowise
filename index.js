const wa = require('@open-wa/wa-automate');
const axios = require('axios');

let userMessages = [];
let timer = null;

// Números permitidos na lista branca (no formato 5511993589393@c.us)
const whitelistedNumbers = [
  '551234567890@c.us',
  '551111111111@c.us',
  '5511912345678@c.us',
  '555499000753@c.us',
  '555484162912@c.us' // Adicione seu número aqui
];

wa.create({
  sessionId: "COVID_HELPER",
  multiDevice: true,
  authTimeout: 60,
  blockCrashLogs: true,
  disableSpins: true,
  headless: true,
  hostNotificationLang: 'PT_BR',
  logConsole: false,
  popup: true,
  qrTimeout: 0,
}).then(client => start(client));

function start(client) {
  // Evento de recebimento de mensagem
  client.onMessage(async message => {
    console.log('Mensagem recebida:', message.body);
    console.log('Remetente:', message.from);

    // Verificar se o número está na lista branca
    if (isNumberWhitelisted(message.from)) {
      console.log('Número autorizado.');

      if (message.body === 'oi') {
        await client.sendText(message.from, '👋 Olá!');
        console.log('Resposta enviada: 👋 Olá!');
      } else {
        // Enviar a pergunta para o endpoint da API
        const question = message.body;
        const token = 'MJ+Q8mSqeUoonDU8MSnMSi/J3M2JVsAjqv7jBArgjvA='; // Substitua pelo seu token de autorização

        try {
          const response = await axios.post('https://flow.limemarketing.online/api/v1/prediction/8e79869b-4b12-43e0-a13b-1c98c54c83d8', {
            question: question
          }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          const answer = response.data.text; // Obter a resposta da API

          await client.sendText(message.from, answer);
          console.log('Resposta enviada:', answer);
        } catch (error) {
          console.error('Erro na solicitação à API:', error);
          await client.sendText(message.from, 'Desculpe, ocorreu um erro ao processar sua pergunta.');
          console.log('Resposta de erro enviada: Desculpe, ocorreu um erro ao processar sua pergunta.');
        }
      }
    } else {
      console.log('Número não autorizado.');
      await client.sendText(message.from, 'Desculpe, você não está autorizado a interagir com este chatbot.');
      console.log('Resposta de autorização negada enviada.');
    }
  });
}

function isNumberWhitelisted(number) {
  // Verificar se o número está presente na lista branca
  return whitelistedNumbers.some(whitelistedNumber => whitelistedNumber === number);
}
