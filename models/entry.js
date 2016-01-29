/* Database schema for datasets*/

var mongoose = require('mongoose');


var entrySchema = mongoose.Schema({
	name: String,
	age: Number,
	sex: String,
	livingInMuenster: String,
	howLong: Number,
	visitMuenster: Number,
	compSkills: Number,
	digitalMaps: Number,
	photoServices: Number,
	sot: [ Number ],
	sotTime: String,
	test1: { 
		images: [ { type: mongoose.Schema.Types.ObjectId, ref: 'TestImage' } ],
		easy: Number,
		quickly: Number,
		comfortable: Number,
		difficult: String,
		like: String,
		dislike: String
	},
	test2: {
		images: [ { type: mongoose.Schema.Types.ObjectId, ref: 'TestImage' } ],
		easy: Number,
		quickly: Number,
		comfortable: Number,
		difficult: String,
		like: String,
		dislike: String
	}
});

entrySchema.virtual('sotMeanError').get(function () {
	var result = [ 123, 237, 83, 156, 319, 235, 333, 260, 280, 48, 26, 150 ]
	var diffSum = 0
	for (j = 0; j<this.sot.length; j++) {
        diffSum = diffSum + Math.abs(this.sot[j]-result[j])
     }
  	return diffSum/this.sot.length
})

entrySchema.virtual('test1.time').get(function () {
	var time = 0
	for (i in this.test1.images) {
		time = time + this.test1.images[i].time
	}
  	return time
})

entrySchema.virtual('test2.time').get(function () {
	var time = 0
	for (i in this.test2.images) {
		time = time + this.test2.images[i].time
	}
  	return time
})
entrySchema.set('toJSON', { virtuals: true });
entrySchema.set('toObject', { virtuals: true });


// create the model for datasets and expose it to our app
module.exports = mongoose.model('Entry', entrySchema);