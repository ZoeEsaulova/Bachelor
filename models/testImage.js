/* Database schema for datasets*/

var mongoose = require('mongoose');


var testImageSchema = mongoose.Schema({
	name: { type: String },
	GPSLatitudeRef: String,
	GPSLatitude: Number,
	GPSLongitudeRef: String,
	GPSLongitude: Number,
	GPSImgDirection: Number,
	familiarPlace: Number,
	directionFromUser: Number,
	markedObjectId: String,
	objectCoordsOnImage: String,
	directionFromObject: Number
});

// create the model for datasets and expose it to our app
module.exports = mongoose.model('TestImage', testImageSchema);