require('dotenv').config()
const speech = require('@google-cloud/speech')
const express = require('express')
const fs = require('fs')
// https://expressjs.com/en/resources/middleware/cors.html
var cors = require('cors')
const Request = require('request')
const multer = require('multer')

const app = express()
const upload = multer()

app.use(cors())

const API_KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS

app.get('/', (req, res) => {
	res.send('SPEECH DOODLE API')
})

// ====== GOOGLE SPEECH API
async function getTranscribed(audioBuffer) {
	const client = new speech.SpeechClient({ keyFilename: API_KEY })
	// const fileName = './resources/audio.raw'
	// const file = fs.readFileSync(fileName)
	// const audioBytes = file.toString('base64')

	const audioBytes = audioBuffer.toString('base64')

	const audio = {
		content: audioBytes
	}

	const config = {
		encoding: 'OGG_OPUS',
		sampleRateHertz: 16000,
		languageCode: 'en-US'
	}

	const request = {
		audio: audio,
		config: config
	}

	const [response] = await client.recognize(request)
	const transcription = response.results
		.map(result => result.alternatives[0].transcript)
		.join('\n')
	console.log(`Transcription: ${transcription}`)
	return response
}
// getTranscribed().catch(console.error)
// ==========

// HANDLE AUDIO DATA FROM THE CLIENT
app.post('/upload-sound', upload.any(), async (req, res) => {
	console.log('Audio file receieved now calling Google Speech API')
	// console.log(req.files[0].buffer)

	let transcription = await getTranscribed(req.files[0].buffer).catch(
		console.error
	)
	// let transcription = req.files[0]
	console.log('Text transcription: ' + transcription)
	res.status(200).send(transcription)
})

// ==
const port = process.env.PORT || 3000
app.listen(port, () => {
	console.log(`Speech Doodle API listening at ${port}...`)
})
