/* Database schema for datasets*/

var mongoose = require('mongoose');


var entrySchema = mongoose.Schema({
	age: Number,
	sex: String,
	large: String, //largest room
	small: String, //smallest room
	like: String,
	dislike: String,
	room1: { 
		sp: Number,
		open: Number,
		rSpace: Number,
		invite: Number,
		rest: Number,
		cozy: Number,
		roomy: Number,
		wide: Number,
		small: Number,
	}
});

// create the model for datasets and expose it to our app
module.exports = mongoose.model('Entry', entrySchema);