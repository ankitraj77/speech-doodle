require('dotenv').config()
const express = require('express')
const chalk = require('chalk')
const fs = require('fs')
var cors = require('cors')

var ndjson = require('ndjson') // npm install ndjson

const app = express()

//
const rawDir = 'raw_data'

// PROCESS NDJSON DATA
// https://www.bennadel.com/blog/3233-parsing-and-serializing-large-datasets-using-newline-delimited-json-in-node-js.htm

// ===========
function parseFiles(fileName, callback) {
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
		})
}
// WRITE
function createFile(newData, newFileName) {
	// var records = [
	// 	{ id: 1, name: 'O Brother, Where Art Thou?' },
	// 	{ id: 2, name: 'Home for the Holidays' },
	// 	{ id: 3, name: 'The Firm' },
	// 	{ id: 4, name: 'Broadcast News' },
	// 	{ id: 5, name: 'Raising Arizona' },
	// 	// .... hundreds of thousands of records ....
	// ]
	var transformStream = ndjson.stringify()
	// Pipe the ndjson serialized output to the file-system.
	var outputStream = transformStream.pipe(
		fs.createWriteStream('optimized_data/' + newFileName)
	)

	// Iterate over the records and write EACH ONE to the TRANSFORM stream individually.
	// Each one of these records will become a line in the output file.
	newData.forEach(function iterator(record) {
		transformStream.write(record)
	})

	// Once we've written each record in the record-set, we have to end the stream so that
	// the TRANSFORM stream knows to flush and close the file output stream.
	transformStream.end()

	// Once ndjson has flushed all data to the output stream, let's indicate done.
	outputStream.on('finish', function handleFinish() {
		console.log(chalk.green('ndjson serialization complete!'))
		console.log('- - - - - - - - - - - - - - - - - - - - - - -')
	})
}
// RAW_DATA DIRECTORY
function processData() {
	fs.readdir(rawDir, (err, file) => {
		console.log('Reading Files inside raw_data')
		console.log(file)
		// ==
		file.forEach((rawFileName) => {
			if (rawFileName != '.DS_Store') {
				parseFiles('raw_data/' + rawFileName, function (err, drawings) {
					let newData = []
					let count = 0
					if (err) return console.error(err)
					for (let i = 0; i < drawings.length; i++) {
						// Do something with the drawing
						if (drawings[i].recognized) {
							newData.push(drawings[i])
							count++
						}
						if (count >= 150) {
							console.log('150 records selected')
							// console.log(newData)
							// newData = JSON.stringify(newData)
							// CREATE A NEW FILE
							let newFileName = newData[0].word
							createFile(newData, newFileName)
							console.log(newFileName + ' file created')
							//
							break
						}
						// console.log(d.key_id, d.countrycode)
					}
					// console.log('# of drawings:', drawings.length)
				})
			}
		})

		// ==
	})
}
processData()

// ============================
const port = process.env.PORT || 3000
app.listen(port, () => {
	console.log(`Process Data API listening at ${port}...`)
})
