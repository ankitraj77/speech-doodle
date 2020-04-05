require('dotenv').config()
const express = require('express')
const multer = require('multer')
const fs = require('fs')
var cors = require('cors')

var ndjson = require('ndjson') // npm install ndjson

const upload = multer()

const app = express()

//
const dataDir = 'optimized_data/'

// FOR HEROKU ENV
// fs.writeFile(
// 	process.env.GOOGLE_APPLICATION_CREDENTIALS,
// 	process.env.GCP_CRED,
// 	err => {}
// )

// FOR LOCAL ENV
// const GOOGLE_APPLICATION_CREDENTIALS =
// 	process.env.GOOGLE_APPLICATION_CREDENTIALS

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
	// const client = new speech.SpeechClient()
	const client = new speech.SpeechClient({
		credentials: GOOGLE_APPLICATION_CREDENTIALS,
	})

	const audio = {
		content: audioBuffer.toString('base64'),
	}
	const config = {
		encoding: 'LINEAR16',
		// sampleRateHertz: 44100,
		languageCode: 'en-US',
	}
	const request = {
		audio: audio,
		config: config,
	}

	const [response] = await client.recognize(request)
	const transcription = response.results
		.map((result) => result.alternatives[0].transcript)
		.join('\n')
	return transcription
}

// HOME
app.get('/test', (req, res) => {
	let fileName = dataDir + 'tractor.ndjson'
	parseSimplifiedDrawings(fileName, function (err, drawings) {
		if (err) return console.error(err)
		console.log('# of drawings:', drawings.length)
		res.status(200).send(drawings)
	})
})

// GET AUDIO FILE FROM CLIENT
app.post('/upload_sound', upload.any(), async (req, res) => {
	console.log('Getting text transcription..')
	let transcription = await getSpeechToText(req.files[0].buffer).catch(
		console.error
	)
	let things = await understandSyntax(transcription).catch(console.error)
	console.log('Text transcription: ' + transcription)

	//
	if (things.length > 0) {
		let fileName = dataDir + things[0]
		parseSimplifiedDrawings(fileName, function (err, drawings) {
			if (err) {
				console.error(err)

				let result = {
					transcript: transcription,
					things: [],
					doodles: [],
				}
				res.status(200).send(result)
			} else {
				console.log('# of drawings:', drawings.length)
				let result = {
					transcript: transcription,
					things: things,
					doodles: drawings,
				}
				res.status(200).send(result)
			}
		})
	} else {
		let result = {
			transcript: transcription,
			things: [],
			doodles: [],
		}
		res.status(200).send(result)
	}

	//

	// res.status(200).send(result)
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
	// const client = new language.LanguageServiceClient()
	const client = new language.LanguageServiceClient({
		credentials: GOOGLE_APPLICATION_CREDENTIALS,
	})

	// The text to analyze
	const text = 'Draw a butterfly and a duck.'

	const document = {
		content: content,
		type: 'PLAIN_TEXT',
	}

	// Need to specify an encodingType to receive word offsets
	const encodingType = 'UTF8'

	// Detects the sentiment of the text
	const [result] = await client.analyzeSyntax({ document, encodingType })

	// COLLECT NOUNS IN AN ARRAY
	let things = []
	if (result.tokens) {
		result.tokens.forEach((poS) => {
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

// ========================= GET QUICK-DRAW DRAWINGS
function parseSimplifiedDrawings(fileName, callback) {
	// Check if file exist
	fs.access(fileName, fs.F_OK, (err) => {
		if (err) {
			console.error(err)
			callback(err, null)
			return
		}
		//file exists
		var drawings = []
		var fileStream = fs.createReadStream(fileName)
		fileStream
			.pipe(ndjson.parse())
			.on('data', function (obj) {
				drawings.push(obj)
			})
			.on('error', callback)
			.on('end', function () {
				callback(null, drawings)
				// console.log('END')
			})
	})
}

// parseSimplifiedDrawings('data/tractor.ndjson', function(err, drawings) {
// 	if (err) return console.error(err)
// 	drawings.forEach(function(d) {
// 		// Do something with the drawing
// 		console.log(d.key_id, d.countrycode)
// 	})
// 	console.log('# of drawings:', drawings.length)
// })

// ============================
const port = process.env.PORT || 3000
app.listen(port, () => {
	console.log(`Speech Doodle API listening at ${port}...`)
})
