/* Database schema for datasets*/

var mongoose = require('mongoose');


var testImageSchema = mongoose.Schema({
	name: { type: String },
	test: Number,
	GPSLatitudeRef: String,
	GPSLatitude: Number,
	GPSLongitudeRef: String,
	GPSLongitude: Number, 
	GPSImgDirection: Number,
	focalLength: Number,
	familiarPlace: Number,
	directionFromUser: Number,
	markedObjectId: String,
	objectCoordsOnImage: String,
	centerCoordsOnMap: String,
	imageSize: String,
	directionFromObject: Number,
	polygonCoords: []
});

// create the model for datasets and expose it to our app
module.exports = mongoose.model('TestImage', testImageSchema);