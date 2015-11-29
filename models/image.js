/* Database schema for datasets*/

var mongoose = require('mongoose');


var imageSchema = mongoose.Schema({
	name: { type: String },
	coords: [{ type: Number }],
	path: { type: String }
});

// create the model for datasets and expose it to our app
module.exports = mongoose.model('MyImage', imageSchema);