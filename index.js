const wa = require('@open-wa/wa-automate');
const axios = require('axios');
const whisper = require('whisper-node');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

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

const tempDir = './temp';

function start(client) {
  // Evento de recebimento de mensagem
  client.onMessage(async message => {
    console.log('Mensagem recebida:', message.body);
    console.log('Remetente:', message.from);

    // Verificar se o número está na lista branca
    if (isNumberWhitelisted(message.from)) {
      console.log('Número autorizado.');

      // Ensure the temp directory exists
      if (!fs.existsSync(tempDir)){
        fs.mkdirSync(tempDir);
      }
      // Check if the message is audio
      if (message.mimetype && message.mimetype.startsWith('audio/')) {
        // Convert the audio to text
        const mediaData = await client.decryptMedia(message);
        const audioFile = `${tempDir}/${message.from}_${message.id}.ogg`;
        fs.writeFileSync(audioFile, mediaData, 'base64');
        try {
        const audioText = await convertAudioToText(audioFile);
        // Add the converted text and timestamp to the user messages array
        userMessages.push({
          text: audioText,
          timestamp: new Date().toISOString()
        });
      } catch (conversionError) {
        console.error('Error processing audio message:', conversionError);
        await client.sendText(message.from, 'Desculpe, ocorreu um erro ao converter sua mensagem de áudio.');
      }
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

async function convertAudioToText(audioFilePath) {
  return new Promise((resolve, reject) => {
    const wavFilePath = audioFilePath.replace(/\.\w+$/, '.wav');
    // Convert to .wav format using ffmpeg
    exec(`ffmpeg -i ${audioFilePath} -ar 16000 ${wavFilePath}`, async (error) => {
      if (error) {
        console.error('Error converting audio file:', error);
        return reject(error);
      }
      // Transcribe the audio file using whisper-node
      try {
        const transcript = await whisper(wavFilePath);
        // Concatenate the speech segments into a single string
        const transcribedText = transcript.map(segment => segment.speech).join(' ');
        fs.unlinkSync(wavFilePath); // Clean up the temporary .wav file
        resolve(transcribedText);
      } catch (transcriptionError) {
        console.error('Error transcribing audio file:', transcriptionError);
        reject(transcriptionError);
      }
    });
  });
}

  // Transcribe the audio file using whisper-node
  const transcript = await whisper(wavFilePath);
  // Concatenate the speech segments into a single string
  const transcribedText = transcript.map(segment => segment.speech).join(' ');
  return transcribedText;
}
