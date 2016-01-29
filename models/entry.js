/* Database schema for datasets*/

var mongoose = require('mongoose');
var mongooseToCsv = require('mongoose-to-csv');

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
	},
	temp: String
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

entrySchema.plugin(mongooseToCsv, {
  headers: 'sot_result Name Age Sex livingInMuenster howLong visitMuenster compSkills digitalMaps photoServices sotTime sotMeanError test1_easy test1_time',
  constraints: {
    'Name': 'name',
	"Age": "age",
	"Sex": "sex",
	"livingInMuenster": "livingInMuenster",
	"howLong": "howLong",
	"visitMuenster": "visitMuenster", 
	"compSkills": "compSkills",
	"digitalMaps": "digitalMaps",
	"photoServices": "photoServices",
	"sotTime": "sotTime",
	"test1_easy": "tes1.easy",
	"test1_time": "test1.time"
  },
  virtuals: {
    'sotMeanError': function(doc) {
    	return doc.sotMeanError 
    },
    'sot_result': function(doc) {
    	var sotString = ""
    	for (i=0;i<doc.sot.length;i++) {
    		sotString = sotString + " " + doc.sot[i]
    		console.log("Sot_result: " + doc.sot.length + " " + doc.sot[i])
    	}
    	
    	return sotString
    }
	}
})


entrySchema.set('toJSON', { virtuals: true });
entrySchema.set('toObject', { virtuals: true });


// create the model for datasets and expose it to our app
module.exports = mongoose.model('Entry', entrySchema);