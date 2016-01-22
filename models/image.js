/* Database schema for datasets*/

var mongoose = require('mongoose');


var imageSchema = mongoose.Schema({
	name: { type: String },
	path: String,
	coords: [ Number ],
	direction: Number,
	buildings: []
});

// create the model for datasets and expose it to our app
module.exports = mongoose.model('Image', imageSchema);