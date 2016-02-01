var express = require('express');
var router = express.Router();
var MySurveyImage = require('../models/SurveyImage');
var multer = require('multer');
var fs = require('fs');
router.use(multer({ dest: './public/images', inMemory: true }).single('image'));
var request = require('request'); 
var exif = require('exif-reader');
var proj4 = require('proj4');


module.exports = {
	/**
	* Find buildings in 300-m radius
	* @param {String} name image name
	*/
  	findBuildingsForTestImages: function (name) {
	  	var buf = fs.readFileSync('C:/users/Zoe/Bachelor/public/images/' + name + ".jpg");      
		var parser = require('exif-parser').create(buf);
		var result = parser.parse();
		//read GPS data
		var dec = [ result.tags.GPSLatitude, result.tags.GPSLongitude ]
		var latlon = dec[0] + "," + dec[1]
		var data = 'way(around:' + 300 + ',' + latlon +  ')["building"];'
		var url = 'http://overpass-api.de/api/interpreter?data=[out:json];' + data + 'out geom;';
		var lat = dec[0]
		var lon = dec[1]
		var latlon = proj4(proj4('EPSG:4326'), proj4('EPSG:3857'), [ lon, lat ])
		//send a request to overpass API
        request(
      	{ method: 'GET'
      	, uri: url
      	, gzip: true
      	}
    	, function (error, response, body) {
	        var result = JSON.parse(body).elements
	        var buildings = []
	        var bodyString = body
		    for (element in result) {          
		        var nodes = result[element].geometry
		        var geometry = []
		        for (node in nodes) {
		            var lat = Number(nodes[node].lat)
		            var lon = Number(nodes[node].lon)
		            var oneNode = proj4(proj4('EPSG:4326'), proj4('EPSG:3857'), [ lon, lat ])
		            geometry.push(oneNode)
		        }
		        buildings.push({ id: result[element].id, geometry: [geometry] }) 
		    }
		    var imageForSurvey = new MySurveyImage({ 
		        name: name,
		        coords: [ Number(latlon[0]), Number(latlon[1]) ],
		        buildings: buildings
		    })

		    imageForSurvey.save(function (err) {
		        if (err) return console.error(err)
		    }) 
		}) 
  	}
}