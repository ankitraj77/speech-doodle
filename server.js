require('dotenv').config()
const express = require('express')
const multer = require('multer')
const fs = require('fs')
var cors = require('cors')

const upload = multer()

const app = express()
const port = 3000
const API_KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS

console.log(API_KEY)

app.use(cors())

app.use(express.static('./'))

async function testGoogleTextToSpeech(audioBuffer) {
	const speech = require('@google-cloud/speech')
	const client = new speech.SpeechClient({ keyFilename: API_KEY })

	const audio = {
		content: audioBuffer.toString('base64')
	}
	const config = {
		encoding: 'LINEAR16',
		sampleRateHertz: 44100,
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
	return transcription
}

// HOME
app.get('/', (req, res) => {
	res.send('Server Js')
})

// GET AUDIO FILE FROM CLIENT
app.post('/upload_sound', upload.any(), async (req, res) => {
	console.log('Getting text transcription..')
	let transcription = await testGoogleTextToSpeech(req.files[0].buffer).catch(
		console.error
	)
	console.log('Text transcription: ' + transcription)
	res.status(200).send(transcription)
})

app.listen(port, () => {
	console.log(`Express server listening on port: ${port}...`)
})
