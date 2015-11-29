var express = require('express');
var router = express.Router();
var MyImage = require('../models/image');
var Entry = require('../models/entry');
var multer = require('multer');
router.use(multer({ dest: './public/images', inMemory: true }).single('image'));
var MAU = require('./modify-and-upload');
var im = require('imagemagick');
var gm = require('gm').subClass({ imageMagick: true });
var fs = require('fs');
var async = require('async');
var dms2dec = require('dms2dec');
var request = require('request');
var orb = require('orbjs');
var LatLon = require('geodesy').LatLonEllipsoidal;
var Dms = require('geodesy').Dms;
var Vector3d = require('geodesy').Vector3d;
var Vec2D = require('vector2d');
var exif = require('exif-reader');
//var easyimg = require('easyimage');


/* proceed to the next image */
router.post('/next', function(req, res) {
  console.log("RESUUUUUUUUULT: " + req.body.lat + " " + req.body.lon + " " + req.body.mapRotation + " " + req.body.nextImage)
var next = Number(req.body.nextImage) + 1
var names = [
  125965433,
  125965576,
  125965583
]

// read exif
      var buf = fs.readFileSync('C:/bachelor/public/images/' + next + ".jpg");      
      var parser = require('exif-parser').create(buf);
      var result = parser.parse();
      var dec = [ result.tags.GPSLatitude, result.tags.GPSLongitude ]

   res.render('home_for_survey.ejs', { 
    imageSource: "http://static.panoramio.com/photos/large/" + names[next] + ".jpg",
    nextImage: next,
    properties: JSON.stringify(dec),
    coordsString: 'Home page'

  })
});

// Hilfsfunktion
function defineVector(fov, targetLat, targetLon, imageCoords) {
  console.log("I'm im defineVektor " + targetLat + " " + targetLon +" " + imageCoords)
  var target = new Vector3d(targetLat, targetLon, imageCoords.z)
  var targetGeo = target.toLatLonE(LatLon.datum.WGS84)
  //set new origin
  var result3 = target.minus(imageCoords)
  console.log("NEW Coordinates: " + targetGeo.lat + " " + targetGeo.lon)
  /*console.log("ORIGIN: " + imageCoords.x + " " + imageCoords.y)
  console.log("TARGET: " + target.z)
  console.log("DIF Z: " + result3.z)
  console.log("length origin: " + imageCoords.length())
  console.log("length target " + target.length())
  */
  //extend the vector
  result3 = result3.times(1.5)
  //create Vec2D objects and rotate them
  var v0 = Vec2D.ObjectVector(result3.x, result3.y).rotate(-fov/2)
  var v1 = Vec2D.ObjectVector(result3.x, result3.y).rotate(fov)
  var left3 = new Vector3d(v0.getX(), v0.getY(), result3.z)
  var right3 = new Vector3d(v1.getX(), v1.getY(), result3.z)

  var left4 = new Vector3d(v0.getX()+imageCoords.x, v0.getY()+imageCoords.y, result3.z+imageCoords.z)
  var right4 = new Vector3d(v1.getX()+imageCoords.x, v1.getY()+imageCoords.y, result3.z+imageCoords.z)

  result1 = left4.toLatLonE(LatLon.datum.WGS84)
  result2 = right4.toLatLonE(LatLon.datum.WGS84)

  var outputGeo1 = 
  result1.toString().slice(0,2) + " " + 
  result1.toString().slice(3,5) + " " + 
  result1.toString().slice(6,8)  + " " + 
  result1.toString().slice(9,10) + " " + 
  result1.toString().slice(12,15)  + " " + 
  result1.toString().slice(16,18) + " " + 
  result1.toString().slice(19,21)+ " " + 
  result1.toString().slice(22,23)

  var outputGeo2 = 
  result2.toString().slice(0,2) + " " + 
  result2.toString().slice(3,5) + " " + 
  result2.toString().slice(6,8)  + " " + 
  result2.toString().slice(9,10) + " " + 
  result2.toString().slice(12,15)  + " " + 
  result2.toString().slice(16,18) + " " + 
  result2.toString().slice(19,21)+ " " + 
  result2.toString().slice(22,23)

  var splitted = outputGeo1.split(" ")
  var output1 = dms2dec([ parseInt(splitted[0]), parseInt(splitted[1]), parseInt(splitted[2])],
   splitted[3],[parseInt(splitted[4]),parseInt(splitted[5]),parseInt(splitted[6])],splitted[7])
  splitted = outputGeo2.split(" ")
  var output2 = dms2dec([ parseInt(splitted[0]), parseInt(splitted[1]), parseInt(splitted[2])],
   splitted[3],[parseInt(splitted[4]),parseInt(splitted[5]),parseInt(splitted[6])],splitted[7])
  var out = output1[0] + " " + output1[1] + " " + output2[0] + " " + output2[1]

  return { out: out, targetGeo: targetGeo }

}

/* define polygon nodes from given map rotation */ 
function findPolygonFromRotation(fov, mapRotation, lat, lon) {
  console.log("I'm in FindPolygon From Rotation")
  var imageCoordsGeo = new LatLon(Number(lat), Number(lon), LatLon.datum.WGS84)
  var rad = mapRotation
  var degrees = Math.abs(rad)*(180/Math.PI)
          if (degrees > 360) { 
              degrees = degrees - (Math.floor(degrees / 360)*360) 
          } 
          if (rad<0) {
            degrees = 360 - degrees
          }
  var rotation = degrees
  var alpha = 0
  var lon = 0
  var lat = 0
  var distance = 100
  if (rotation<=90) {
    alpha = rotation
    alpha = orb.common.deg2rad(alpha)
    lon = -Math.sin(alpha)*distance
    lat = -Math.cos(alpha)*distance
  } else if (rotation>90 && rotation<=180) {
    alpha = 180-rotation
    alpha = orb.common.deg2rad(alpha)
    lon = -Math.sin(alpha)*distance
    lat = Math.cos(alpha)*distance
  } else if (rotation>180 && rotation<=270) {
    alpha = rotation-180
    alpha = orb.common.deg2rad(alpha)
    lon = Math.sin(alpha)*distance
    lat = Math.cos(alpha)*distance
  } else {
    alpha = 360-rotation
    alpha = orb.common.deg2rad(alpha)
    lon = Math.sin(alpha)*distance
    lat = -Math.cos(alpha)*distance
  }

  var imageCoords = imageCoordsGeo.toCartesian()
  var targetLat = Number(imageCoords.x)+Number(lat)
  var targetLon = Number(imageCoords.y)+Number(lon)

  return defineVector(fov, targetLat, targetLon, imageCoords)

}

/* NOT IMPLEMENTED YET */
/* define polygon nodes from matched object */
function findPolygonFromObject(fov, lat, lon, imageSize, objectCoords, objectCoordsMap) {
  var imageCoordsGeo = new LatLon(Number(lat), Number(lon), LatLon.datum.WGS84)
    // if object marked

  var radInPixel = fov/Number(imageSize)
  var splitOb = objectCoords.split(" ")
  var selectionCenter = Number(splitOb[2])-Number(splitOb[0])
  // if object to the left of the center - positiv offset
  var offset = (Number(req.query.imageSize)/2)-selectionCenter
  console.log("Width: " + imageSize + " Diff: " + offset + "coords " + splitOb)
  var radOffset = offset*radInPixel

  // get req.query.objectCoordsMap

  var targetGeo0 = new LatLon(53.544778, 9.951478, LatLon.datum.WGS84)
  var target0 = targetGeo0.toCartesian()
  var imageCoords = imageCoordsGeo.toCartesian()
  //var target0 = new Vector3d(targetLat0, targetLon0, imageCoords.z)

  //set new origin
  var result0 = target0.minus(imageCoords)
  console.log("Rad offset: " + radOffset)
  var preResult = Vec2D.ObjectVector(result0.x, result0.y).rotate(-2*radOffset)
  var targetLat = preResult.x+Number(imageCoords.x)
  var targetLon = preResult.y+Number(imageCoords.y)

  return defineVector(fov, targetLat, targetLon, imageCoords)

}

/* display polygon on map */
router.get('/showPolygon', function(req, res) {
console.log("I'm in triangle")
var result = findPolygonFromRotation(1.176352, req.query.mapRotation, req.query.lat, req.query.lon)
 
res.send({ 
  coords: result.out, 
  lat: req.query.lat, 
  lon: req.query.lon, 
  targetLat: result.targetGeo.lat,
  targetLon: result.targetGeo.lon
  })

});

/* GET home page (Survey) */
router.get('/survey', function(req, res) {
  if (!req.query.nextImage) {
    var image = 0
  } else {
    var image = req.query.nextImage
  }
  
      // read exif
      var buf = fs.readFileSync('C:/bachelor/public/images/' + image + ".jpg");      
      var parser = require('exif-parser').create(buf);
      var result = parser.parse();
      var dec = [ result.tags.GPSLatitude, result.tags.GPSLongitude ]
console.log("AAAAAAAAAAAAAAAAAAAAAA: " + JSON.stringify(dec))
      res.render('home_for_survey.ejs', { 
        coordsString: 'Home page', 
        imageSource:"http://static.panoramio.com/photos/large/125965433.jpg",
        properties: JSON.stringify(dec),
        nextImage: "0"
        });
});
router.get('/', function(req, res) {

      res.render('home.ejs', { 
        coordsString: 'Home page', 
        properties: "[51.964045, 7.609542]",

        });


});
/* GET home page. */
router.get('/error', function(req, res) {
  res.render('error.ejs', { title: 'Home page' });
}); 

/* GET nodes, ways and relations inside a triangle polygon */
router.post('/overpass', function(req, res) {
  console.log("COORDSSTRING: " + req.body.polyCoords)

  var data = 'way(poly:"' + req.body.polyCoords + '")["building"];'
  var url = 'http://overpass-api.de/api/interpreter?data=[out:json];' + data + 'out;';
  request(
      { method: 'GET'
      , uri: url
      , gzip: true
      }
    , function (error, response, body) {
      console.log("Get response: " + response);
      console.log("Get body: " + body);
      res.render("test.ejs", {
        data: JSON.stringify(JSON.parse(body), null, 4)
      });
    });
}); 

/* Upload an image */
router.post('/upload', function(req, res) {
	console.log("Button pressed")
  console.log(req.file.originalname)

var serverPath = '/images/' + req.file.originalname;
//working saving 

  fs.rename(req.file.path, 'C:/bachelor/public' + serverPath, function(error) {
    if (error) {
      res.send({
        error: 'Ah crap! Something bad happened'
      });
      return;
    } else {
      console.log("File saved")

      // read exif
      var buf = fs.readFileSync('C:/bachelor/public' + serverPath);      
      var parser = require('exif-parser').create(buf);
      var result = parser.parse();
      console.log(result)
  
/*
      var exif2 = require('exif2');

      exif2('C:/bachelor/public' + serverPath, function(err, obj){
        console.log(obj);
      })

          
          var dec = dms2dec(result.tags.GPSLatitude, result.tags.GPSLatitudeRef, 
              result.tags.GPSLongitude, result.tags.GPSLongitudeRef);
          */
          var dec = [ result.tags.GPSLatitude, result.tags.GPSLongitude ]
          //res.send(exifData)
          res.render('image.ejs', { 
            imagePath: serverPath,
            //gps: GPSLatitude, GPSLongitude           
            properties: JSON.stringify(dec)
           // data: JSON.stringify(dec)
            });

/* WORKING
//save image in db
var image = new MyImage({ 
    name: req.file.originalname,
    path: 'C:/bachelor/public' + serverPath,
    coords: dec })

  image.save(function (err) {
    if (err) return console.error(err)
      else console.log("Saved in database")
  });
*/


            } });
                     
  });



module.exports = router;
