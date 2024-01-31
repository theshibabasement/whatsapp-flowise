const axios = require('axios');
const fs = require('fs');

const OPENAI_API_KEY = 'YOUR_API_KEY'; // Replace with your actual OpenAI API key

async function sendAudioToWhisperAPI(filePath) {
    try {
        const audioData = fs.readFileSync(filePath);
        const response = await axios.post('https://api.openai.com/v1/whisper', audioData, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'audio/wav'
            }
        });

        console.log('Transcription: ', response.data);
    } catch (error) {
        console.error('Error sending audio to Whisper API:', error);
    }
}

async function main() {
    const filePath = 'path/to/your/audio/file.wav'; // Replace with the actual path to your audio file
    await sendAudioToWhisperAPI(filePath);
}

main();
