const wa = require('@open-wa/wa-automate');
const axios = require('axios');
const openai = require('openai');

openai.apiKey = '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';

let userMessages = [];
let timer = null;
const waitTime = 1000; // 45 seconds

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

      // Check if the message is audio
      if (message.mimetype && message.mimetype.startsWith('audio/')) {
        // Convert the audio to text
        const mediaData = await client.decryptMedia(message);
        const audioFile = `./temp/${message.from}_${message.id}.mp3`;
        fs.writeFileSync(audioFile, mediaData, 'base64');
        const audioText = await convertAudioToText(audioFile);
        // Add the converted text and timestamp to the user messages array
        userMessages.push({
          text: audioText,
          timestamp: new Date().toISOString()
        });
        fs.unlinkSync(audioFile); // Clean up the temporary audio file
      } else {
        // Add the message and timestamp to the user messages array
        userMessages.push({
          text: message.body,
          timestamp: new Date().toISOString()
        });
      }

      // Limpar o timer existente
      if (timer) {
        clearTimeout(timer);
      }

      // Iniciar um novo timer
      timer = setTimeout(async () => {
        // Enviar todas as mensagens do usuário para o endpoint da API
        const token = 'MJ+Q8mSqeUoonDU8MSnMSi/J3M2JVsAjqv7jBArgjvA='; // Substitua pelo seu token de autorização

        try {
          const response = await axios.post('https://flow.limemarketing.online/api/v1/prediction/8e79869b-4b12-43e0-a13b-1c98c54c83d8', {
            question: userMessages.map(message => `${message.timestamp} - ${message.text}`).join('\n')
          }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          const answer = response.data.text; // Obter a resposta da API

          await client.sendText(message.from, answer);
          console.log('Resposta enviada:', answer);

          // Limpar as mensagens do usuário
          userMessages = [];
        } catch (error) {
          console.error('Erro na solicitação à API:', error);
          await client.sendText(message.from, 'Desculpe, ocorreu um erro ao processar sua pergunta.');
          console.log('Resposta de erro enviada: Desculpe, ocorreu um erro ao processar sua pergunta.');
        }
      }, waitTime);
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

const FormData = require('form-data');
const fs = require('fs');

async function convertAudioToText(audioFile) {
  // Use OpenAI's Whisper model to convert audio to text
  const form = new FormData();
  form.append('file', fs.createReadStream(audioFile));
  form.append('model', 'whisper-1');

  const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
    headers: {
      'Authorization': `Bearer ${openai.apiKey}`,
      ...form.getHeaders()
    }
  });

  // By default, the response type will be json with the raw text included.
  return response.data.text;
}
