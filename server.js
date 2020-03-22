require('dotenv').config()
const express = require('express')
const multer = require('multer')
const fs = require('fs')
var cors = require('cors')

const upload = multer()

const app = express()

// FOR HEROKU ENV
// fs.writeFile(
// 	process.env.GOOGLE_APPLICATION_CREDENTIALS,
// 	process.env.GCP_CRED,
// 	err => {}
// )

// FOR LOCAL ENV
// const API_KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS

// FOR HEROKU ENV
const GOOGLE_APPLICATION_CREDENTIALS = JSON.parse(
	process.env.GOOGLE_APPLICATION_CREDENTIALS
)

// console.log('++++++++++++++++ PRINTING API KEY +++++++++++')
// console.log(API_KEY)

app.use(cors())

app.use(express.static('./'))

// ================================ SPEECH
async function getSpeechToText(audioBuffer) {
	const speech = require('@google-cloud/speech')
	const client = new speech.SpeechClient({
		credentials: GOOGLE_APPLICATION_CREDENTIALS
	})

	const audio = {
		content: audioBuffer.toString('base64')
	}
	const config = {
		encoding: 'LINEAR16',
		// sampleRateHertz: 44100,
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
	res.send('Speech Server Js')
})

// GET AUDIO FILE FROM CLIENT
app.post('/upload_sound', upload.any(), async (req, res) => {
	console.log('Getting text transcription..')
	let transcription = await getSpeechToText(req.files[0].buffer).catch(
		console.error
	)
	let things = await understandSyntax(transcription).catch(console.error)
	console.log('Text transcription: ' + transcription)
	let result = {
		transcript: transcription,
		things: things
	}
	res.status(200).send(result)
})

// ======================= NATURAL LANGUAGE API
// let textData = {
// 	document: {
// 		type: 'PLAIN_TEXT',
// 		content:
// 			'Joanne Rowling, who writes under the pen names J. K. Rowling and Robert Galbraith, is a British novelist and screenwriter who wrote the Harry Potter fantasy series.'
// 	},
// 	encodingType: 'UTF8'
// }
//
async function understandSyntax(content) {
	// Imports the Google Cloud client library
	const language = require('@google-cloud/language')

	// Instantiates a client
	const client = new language.LanguageServiceClient({
		credentials: GOOGLE_APPLICATION_CREDENTIALS
	})

	// The text to analyze
	const text = 'Draw a butterfly and a duck.'

	const document = {
		content: content,
		type: 'PLAIN_TEXT'
	}

	// Need to specify an encodingType to receive word offsets
	const encodingType = 'UTF8'

	// Detects the sentiment of the text
	const [result] = await client.analyzeSyntax({ document, encodingType })

	// COLLECT NOUNS IN AN ARRAY
	let things = []
	if (result.tokens) {
		result.tokens.forEach(poS => {
			if (poS.partOfSpeech.tag == 'NOUN') things.push(poS.text.content)
		})
	}

	return things
}
//
app.get('/language', async (req, res) => {
	let nlpResult = await understandSyntax().catch(console.error)
	res.status(200).send(nlpResult)
})

//
const port = process.env.PORT || 3000
app.listen(port, () => {
	console.log(`Speech Doodle API listening at ${port}...`)
})
