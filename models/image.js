/* Database schema for datasets*/

var mongoose = require('mongoose');
var mongooseToCsv = require('mongoose-to-csv');

var imageSchema = mongoose.Schema({
	name: { type: String },
	path: String,
	coords: [ Number ],
	direction: Number,
	buildings: [],
	temp: String
});

imageSchema.plugin(mongooseToCsv, {
  headers: 'ID Name path direction',
  constraints: {
    'Name': 'name',
    'path': 'path',
    'direction': 'direction'
  },
    virtuals: {
    'ID': function(doc) {
		return doc._id	
    }
  }
});

// create the model for datasets and expose it to our app
module.exports = mongoose.model('Image', imageSchema);