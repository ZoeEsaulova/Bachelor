/* Database schema for survey results*/

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
	temp: String,
	test1Time: Number,
	test2Time: Number,
	test1Result: Number,
	test2Result: Number
});

entrySchema.virtual('sotMeanError').get(function () {
	var result = [ 123, 237, 83, 156, 319, 235, 333, 260, 280, 48, 26, 150 ]
	var diffSum = 0
	for (j = 0; j<this.sot.length; j++) {
		var diff = Math.abs(this.sot[j]-result[j])
		if (diff>180) {
            diff = 360-diff
        }
        diffSum = diffSum + diff
     }
  	return diffSum/this.sot.length
})

// save all data in a .csv file
entrySchema.plugin(mongooseToCsv, {
  headers: 'ID Name Age Sex livingInMuenster howLong visitMuenster compSkills digitalMaps photoServices sotTime sotMeanError sot_result test1_result test1_time test1_easy test1_quickly test1_difficult test1_comfortable test1_like test1_dislike test2_result test2_time test2_easy test2_quickly test2_difficult test2_comfortable test2_like test2_dislike',
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
	"test1_time": "test1Time",
	"test2_time": "test2Time",
	"test1_result": "test1Result",
	"test2_result": "test2Result"
  },
  virtuals: {
    'sotMeanError': function(doc) {
    	return doc.sotMeanError 
    },
    'sot_result': function(doc) {
    	var sotString = ""
    	for (i=0;i<doc.sot.length;i++) {
    		sotString = sotString + " " + doc.sot[i]
    	}
    	
    	return sotString
    },
    'ID': function(doc) {
		return doc._id	
    },
    'test1_easy': function(doc) {
		return doc.test1.easy	
    },
    'test1_difficult': function(doc) {
		return doc.test1.difficult
    },
    'test1_comfortable': function(doc) {
		return doc.test1.comfortable	
    },
    'test1_like': function(doc) {
		return doc.test1.like	
    },
    'test1_dislike': function(doc) {
		return doc.test1.dislike
    },
    'test1_quickly': function(doc) {
		return doc.test1.quickly
    },
    'test2_easy': function(doc) {
		return doc.test2.easy	
    },
    'test2_difficult': function(doc) {
		return doc.test2.difficult
    },
    'test2_comfortable': function(doc) {
		return doc.test2.comfortable	
    },
    'test2_like': function(doc) {
		return doc.test2.like	
    },
    'test2_dislike': function(doc) {
		return doc.test2.dislike
    },
    'test2_quickly': function(doc) {
		return doc.test2.quickly
    }
}
})


entrySchema.set('toJSON', { virtuals: true });
entrySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Entry', entrySchema);