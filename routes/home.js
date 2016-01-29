var express = require('express');
var async = require('async');
var router = express.Router();
var MyImage = require('../models/image');
var Entry = require('../models/entry');
var MyTestImage = require('../models/testImage');
var Entry = require('../models/entry');
var multer = require('multer');
var fs = require('fs');
router.use(multer({ dest: './public/images', inMemory: true }).single('image'));
var im = require('imagemagick');
var gm = require('gm').subClass({ imageMagick: true });
var dms2dec = require('dms2dec');
var request = require('request');
var orb = require('orbjs'); 
var LatLon = require('geodesy').LatLonEllipsoidal;
var Dms = require('geodesy').Dms; 
var Vector3d = require('geodesy').Vector3d;
var Vec2D = require('vector2d');
var exif = require('exif-reader');
var turf = require('turf');
//var wgs = require('WGS84IntersectUtil'); 
var gju = require('geojson-utils');
var po = require('poly-overlap');
var reproject = require('reproject-spherical-mercator');
var merc = require('mercator-projection');
var proj4 = require('proj4');


/**
 * Checks if array contains a certain number
 * @param {Number} random
 * @param {[Number]} array
 * @return {boolean} is in array
 */
function randomInArray(random, array) {

  var result = false
  for (index in array) {
    if (random==array[index]) {
      result = true
      break
    }  
  }
  return result
}

/*
*
* Survey
*
*/

/* Spacial Orientation Test*/
router.get('/survey/welcome', function(req, res) {
  res.render('survey_welcome.ejs');
});
/* GET home page (Survey) */

router.get('/survey/:entryId?', function(req, res) {
  var names = [
  126966710,
    //126807950,
    126910684,
    126807944
  ]
  var x = Math.floor((Math.random() * 3));

  
  var buf = fs.readFileSync('C:/users/Zoe/Bachelor/public/images/' + names[x] + ".jpg");      
  var parser = require('exif-parser').create(buf);
  var result = parser.parse();
  var dec = [ result.tags.GPSLatitude, result.tags.GPSLongitude ]
  res.render('home_for_survey.ejs', { 
    coordsString: 'Home page', 
    imageSource:"http://static.panoramio.com/photos/large/" + names[x] + ".jpg",
    properties: JSON.stringify(dec),
    nextImage: x,
    showBuilding: false,
    test: "1",
    all: "false",
    modal: false,
    entryId: req.params.entryId
  });
});

router.get('/survey/part1/:entryId?', function(req, res) {
  res.render('part1.ejs', {
    entryId: req.params.entryId
  });
});

router.post('/submitForm', function(req, res) {
  console.log("inputName: " + req.body.inputName)
  console.log("inputAge: " + req.body.inputAge)
  console.log("sex: " + req.body.sex)
  console.log("muenster: " + req.body.muenster)
  console.log("howLong: " + req.body.howLong)

  console.log("visitMuenster: " + req.body.visitMuenster)
  console.log("compSkills: " + req.body.compSkills)
  console.log("digitalMaps: " + req.body.digitalMaps)
  console.log("photoServices: " + req.body.photoServices)
  //save image in db
  var entry = new Entry({ 
      name: req.body.inputName,
      age: Number(req.body.inputAge),
      sex: req.body.sex,
      livingInMuenster: req.body.muenster,
      howLong: Number(req.body.howLong),
      visitMuenster: Number(req.body.visitMuenster),
      compSkills: Number(req.body.compSkills),
      digitalMaps: Number(req.body.digitalMaps),
      photoServices: Number(req.body.photoServices),
  })

    entry.save(function (err) {
      if (err) return console.error("Database error: " + err)
        else console.log("Saved in database")
    });


    var entryId = entry._id
  res.redirect('/survey/part1/' + entryId);
});

router.get('/survey/part2/:entryId?', function(req, res) {
  res.render('part2.ejs', {
    entryId: req.params.entryId
  });
});

router.get('/thanks', function(req, res) {
  res.render('thanks.ejs');
});
/* Render different pages depending for the survey 
*  there are 2 tests:
*  test 1: display camera marker
*  test 2: display flag marker and buildings
*/
router.post('/survey/next/:entryId?', function(req, res) {

  console.log("V  A  L  U  E  S  ___________________________________________")
  console.log("known " + req.body.known)
  console.log("nextImage " + req.body.nextImage)
  console.log("mapRotation " + req.body.mapRotation)
  console.log("lat " + req.body.lat)
  console.log("lon " + req.body.lon)
  console.log("test " + req.body.test)
  console.log("whatLike " + req.body.whatLike)
  console.log("whatDislike " + req.body.whatDislike)
  console.log("whatDifficult " + req.body.whatDifficult)
  console.log("comfortable " + req.body.comfortable)
  console.log("quickly " + req.body.quickly)
  console.log("easy " + req.body.easy)
  console.log("Time: " + req.body.time)
  console.log("Demo?: " + req.body.demoClicked)
  var originLat = Number(req.body.lat)
  var originLon = Number(req.body.lon)
  var arrow
  var array = req.body.nextImage.split(" ") 
  var curIndex = Number(array[array.length-1])
  var showBuilding = false 
  //calculate time needed for the test image
  var timeSplit = req.body.time.split(":")
  var time = 1800-(Number(timeSplit[2])+(Number(timeSplit[1])*60))
  var demoDur = 100
  if (req.body.demoClicked=="ja" && array.length==1) {
    time = time - demoDur
  } else if (req.body.demoClicked=="ja") {
    time = time - 20
  } 
  console.log("Result time: " + time)
  var names = []  
    // define file names for each test
  if (req.body.test=="1") {
    names = [
    //126807950, 
    126966710, //USED FOR DEMOS ONLY
    126910684,
    126807944
    ]
    arrow = "arrow";
  } else if (req.body.test=="2") {
    console.log("Arrow: " + arrow)
     names = [
      //125965583,
      126966710, //USED FOR DEMOS ONLY
      126810608,
      126810619
    ]
    arrow = '"Point"'
    showBuilding = true
  } 

  // read exif data of a current image
  var buf = fs.readFileSync('C:/users/Zoe/Bachelor/public/images/' +  names[curIndex] + ".jpg");      
  var parser = require('exif-parser').create(buf);
  var result = parser.parse();
  //read GPS data
  var dec = [ result.tags.GPSLatitude, result.tags.GPSLongitude ]
  //console.log("EXIF: _____________________________________ ")
  // read focal length
  var focalLength = result.tags.FocalLength
  var sensorWidth = 6.17
  var fov = 2*Math.atan(0.5*sensorWidth/Number(focalLength))

  //save in db
  var testImage = new MyTestImage({ 
    name: names[curIndex],
    test: Number(req.body.test),    
    GPSLatitudeRef: result.tags.GPSLatitudeRef,
    GPSLatitude: Number(result.tags.GPSLatitude),
    GPSLongitudeRef: result.tags.GPSLongitudeRef,
    GPSLongitude: Number(result.tags.GPSLongitude),
    GPSImgDirection: Number(result.tags.GPSImgDirection),
    focalLength: Number(result.tags.FocalLength),
    familiarPlace: Number(req.body.known),
    directionFromUser: 360-radToDegree(Number(req.body.mapRotation)),
    time: time

  })
  testImage.save(function (err) {
    if (err) return console.error(err)
    else console.log("Image " + array[array.length-1] + " is saved in database")
  });
  var imageId = testImage._id
  if (req.body.markedObjectId!="y") {

  MyTestImage.findOne({ _id: testImage._id}).exec(function(err, image) {
      image.markedObjectId = req.body.markedObjectId
      image.objectCoordsOnImage = req.body.objectCoords
      image.centerCoordsOnMap = req.body.objectCoordsMap
      var parsed = JSON.parse(req.body.objectCoordsMap)
      var targetLat = Number(parsed[0].x)
      var targetLon = Number(parsed[0].y)
      console.log("22222222222222222 " + targetLat + " " + targetLon + " " + originLat + " " + originLon)
      image.directionFromObject = Number(findRotationFromTarget(targetLat, targetLon, originLat, originLon))
      console.log("Rot: " + Number(findRotationFromTarget(targetLat, targetLon, originLat, originLon)))
      polygonCoords = findPolygonFromObject(fov, req.body.lat, req.body.lon, req.body.imageSize, req.body.objectCoords, req.body.objectCoordsMap)[0]
      image.save()
  })
} else {
  MyTestImage.findOne({ _id: testImage._id}).exec(function(err, image) {
      polygonCoords = findPolygonFromRotation(fov, Number(req.body.mapRotation), req.body.lat, req.body.lon, focalLength)[0]
      image.save()
  })
}
if (req.body.test=="1") {
  Entry.findOne({ _id: req.params.entryId }).exec(function(err, entry) {
    entry.test1.images.push(imageId)
    entry.save()
    console.log("JA! ------------ " + entry.test1.time)
  })
} else {
  Entry.findOne({ _id: req.params.entryId }).exec(function(err, entry) {
    entry.test2.images.push(imageId)
    entry.save()
  })
}
  
if (array.length==3 && req.body.test=="1") {
  Entry.findOne({ _id: req.params.entryId }).exec(function(err, entry) {
    entry.test1.easy = Number(req.body.easy),
    entry.test1.quickly = Number(req.body.quickly),
    entry.test1.comfortable = Number(req.body.comfortable),
    entry.test1.difficult = req.body.whatDifficult,
    entry.test1.like = req.body.whatLike,
    entry.test1.dislike = req.body.whatDislike
    entry.save()
  })
} else if (array.length==3 && req.body.test=="2") {
  Entry.findOne({ _id: req.params.entryId }).exec(function(err, entry) {
    entry.test2.easy = Number(req.body.easy),
    entry.test2.quickly = Number(req.body.quickly),
    entry.test2.comfortable = Number(req.body.comfortable),
    entry.test2.difficult = req.body.whatDifficult,
    entry.test2.like = req.body.whatLike,
    entry.test2.dislike = req.body.whatDislike
    entry.save()
  })
}

  if (array.length==3 && req.body.test=="2") {
    console.log("R E D I R E C T")

    res.redirect("/thanks")
  } else {

  var modal = false
  var test = ""                               // test number (1 to 4)
  var next = ""                               // files which have alredy been tested
                              // file names
   // files that have been tested already
                     // if true, buildings in a certain radius will be displayed
                          // type of a marker (no, flag or camera)
                        // if true, bounding box on image will be disabled 
  if (array.length==2) {
    modal = true
  }
  //go to the next test if 3 images proceeded
  if (array.length==3 && req.body.test=="1") {
    test = "2"
    array = []
    arrow = "point"
    showBuilding = true
  } else {
    test = req.body.test
    next = req.body.nextImage
  }

  // files which have alredy been tested
  var nextArray = []
  for (index in array) {
    nextArray.push(Number(array[index]))
  }
  // define the next file name randomly
  var x = Math.floor((Math.random() * 3))
  while (randomInArray(x, nextArray)) {
    x = Math.floor((Math.random() * 3))
  }
  if (next!="") { 
    next = next + " " + x
  } else {
    next = x
  }
  // read exif data of a current image
  var buf = fs.readFileSync('C:/users/Zoe/Bachelor/public/images/' + names[x] + ".jpg");      
  var parser = require('exif-parser').create(buf);
  var result = parser.parse();
  //read GPS data
  var dec = [ result.tags.GPSLatitude, result.tags.GPSLongitude ]
  //console.log("EXIF: _____________________________________ ")
  // read focal length
  var focalLength = result.tags.FocalLength
  //console.log(focalLength)

  // find buildings in 200-m radius using overpass API
  var latlon = dec[0] + "," + dec[1]
  var data = 'way(around:' + 200 + ',' + latlon +  ')["building"];'
  var url = 'http://overpass-api.de/api/interpreter?data=[out:json];' + data + 'out geom;';
      request(
      { method: 'GET'
      , uri: url
      , gzip: true
      , lalon: latlon
      }
    , function (error, response, body) {
        var result = JSON.parse(body).elements
        var buildings = []
        var bodyString = body
         for (element in result) {          
          var nodes = result[element].geometry
          //var building = ""
          var geometry = []
              for (node in nodes) {
                    var lat = Number(nodes[node].lat)
                    var lon = Number(nodes[node].lon)
                    var oneNode = proj4(proj4('EPSG:4326'), proj4('EPSG:3857'), [ lon, lat ])
                    //building =  building + lat + " " + lon + ":"
                    geometry.push(oneNode)
              }
                  buildings.push({ id: result[element].id, geometry: [geometry] }) 

      }
        // render the next page
        res.render('home_for_survey.ejs', { 
          imageSource: "http://static.panoramio.com/photos/large/" + names[x] + ".jpg",
          nextImage: next,
          properties: JSON.stringify(dec),
          coordsString: 'Home page',
          buildingCoords: JSON.stringify(buildings),
          showBuilding: showBuilding,
          arrow: arrow,
          test: test,
          modal: modal,
          entryId: req.params.entryId
        })
      })
  }

});


/* Display demo videos */
router.get('/demo/:test?', function(req, res) {
  if (req.params.test=="1") {
    //var url = "https://www.dropbox.com/s/ab72878kgaqs4f4/video1.mp4?dl=1"
    var url = "http://www.youtube.com/embed/oSYHyz_kiNQ?autoplay=0"
  } else if (req.params.test=="2") {
    //var url = "https://www.dropbox.com/s/ab72878kgaqs4f4/video1.mp4?dl=1"
    var url = "http://www.youtube.com/embed/oSYHyz_kiNQ?autoplay=0"
  } 
  res.render("demo.ejs", { 
    url: url
  }) ;
});

/* Spacial Orientation Test*/
router.get('/survey/part1/start/:entryId?', function(req, res) {
  res.render('sot.ejs', {
    entryId: req.params.entryId
  });
});


/**
 * Finds target coordinates from rotation
 * @param {Number} rotation
 * @param {Number} tlat Latitude coordinate of the origin
 * @param {Number} tlon Longitude coordinate of the origin
 * @return {Number} distance Distance to the target
 */
function targetFromRotation(rotation, tlat, tlon, distance) {
  var alpha = 0
  var lon = 0
  var lat = 0
  if (rotation<=1.5707963268) {
    alpha = rotation
    lon = -Math.sin(alpha)*distance
    lat = -Math.cos(alpha)*distance
  } else if (rotation>1.5707963268 && rotation<=3.1415926536) {
    alpha = 3.1415926536-rotation
    lon = -Math.sin(alpha)*distance
    lat = Math.cos(alpha)*distance
  } else if (rotation>3.1415926536 && rotation<=4.7123889804) {
    alpha = rotation-3.1415926536
    lon = Math.sin(alpha)*distance
    lat = Math.cos(alpha)*distance
  } else {
    alpha = 6.2831853072-rotation
    lon = Math.sin(alpha)*distance
    lat = -Math.cos(alpha)*distance
  }

  var targetLat3857 = Number(tlat)+Number(lon)
  var targetLon3857 = Number(tlon)+Number(-lat)

  return [targetLat3857, targetLon3857]
}

/**
 * Finds polygon coordinates from rotation
 * @param {Number} rotation
 * @param {Number} tlat Latitude coordinate of the origin
 * @param {Number} tlon Longitude coordinate of the origin
 * @return {fov} fov Field of view
 */
function findPolygonFromRotation(fov, rotation, tlat, tlon, focal) {
  var distance = 16.0437156645*Number(focal) + 190.362376587
  console.log("findPolygonFromRotation: " + fov + " " + rotation  + " " + tlat + " " + tlon + " " + focal)
  var target = targetFromRotation(rotation, tlat, tlon, distance)
  var targetLat3857 = target[0]
  var targetLon3857 = target[1]

  //rotate
  var x = targetLat3857 - Number(tlat)
  var y = targetLon3857 - Number(tlon)
  var a = Number(fov)/2
  var xLeft = (x*Math.cos(a)) - (y*Math.sin(a)) + Number(tlat)
  var yLeft = (x*Math.sin(a)) + (y*Math.cos(a)) + Number(tlon)
  var xRight = (x*Math.cos(a)) + (y*Math.sin(a)) + Number(tlat)
  var yRight = (y*Math.cos(a)) - (x*Math.sin(a)) + Number(tlon)

  var result1 = [{ 
    originLat: tlat,
    originLon: tlon, 
    targetLat: targetLat3857,
    targetLon: targetLon3857,
    leftLat: xLeft,
    leftLon: yLeft,
    rightLat: xRight,
    rightLon: yRight
  }]
  var newRotation = 360-radToDegree(Number(rotation))
  return [ result1,  newRotation ]
}

/**
 * Finds rotation from target coordinates
 * @param {targetLat} tlat Latitude coordinate of the target
 * @param {targetLon} tlon Longitude coordinate of the target
 * @param {originLat} tlat Latitude coordinate of the origin
 * @param {originLon} tlon Longitude coordinate of the origin
 * @return {Number} distance Distance to the target
 */
function findRotationFromTarget(targetLat, targetLon, originLat, originLon) {
  var targetLon = Number(targetLon)
  var targetLat = Number(targetLat)
  var ix = Number(originLat)
  var iy = Number(originLon)
  var lat = targetLat-ix
  var lon = targetLon-iy
  var distance = Math.sqrt(Math.pow(lat,2)+Math.pow(lon,2))
  if ((targetLat>=ix) && (targetLon<=iy)) {
    var rad1 = Math.acos(lat/distance)
    var rad2 = Math.asin(-lon/distance)
    var rad = 3.1415926536-((rad1+rad2)/2)+1.5707963268
    return 360-radToDegree(rad) 
  } else if ((targetLat<=ix) && (targetLon<=iy)) {
    var rad1 = Math.acos(-lat/distance)
    var rad2 = Math.asin(-lon/distance)
    var rad = ((rad1+rad2)/2)+1.5707963268
    return 360-radToDegree(rad) 
  } else if ((targetLat>=ix) && (targetLon>=iy)) {
    var rad1 = Math.acos(lat/distance)
    var rad2 = Math.asin(lon/distance)
    var rad = 3.1415926536+((rad1+rad2)/2)+1.5707963268
    return 360-radToDegree(rad) 
  }  else if ((targetLat<=ix) && (targetLon>=iy)) {
    var rad1 = Math.acos(-lat/distance)
    var rad2 = Math.asin(lon/distance)
    var rad = 6.2831853072-((rad1+rad2)/2) + 1.5707963268
    return 360-radToDegree(rad) 
  }

}
function radToDegree(rad) {
        var degrees = Math.abs(rad)*(180/Math.PI)
        if (degrees > 360) { 
          degrees = degrees - (Math.floor(degrees / 360)*360) 
        } 
        if (rad<0) {
          degrees = 360 - degrees
        }
        return degrees
      }
function targetFromObject(fov, lat, lon, imageSize, objectCoords, objectCoordsMap) {
  var parsed = JSON.parse(objectCoordsMap)
  var targetLat = Number(parsed[0].x)
  var targetLon = Number(parsed[0].y)
  //first rotate (depending on the position on the image)
  var x = targetLat - Number(lat)
  var y = targetLon - Number(lon)
  //define offset
  var radInPixel = fov/Number(imageSize)
  var splitOb = objectCoords.split(" ")
  var selectionCenter = ((Number(splitOb[2])-Number(splitOb[0]))/2)+Number(splitOb[0])
  // if object to the left of the center - positiv offset
  var offset = (Number(imageSize)/2)-selectionCenter
  var a = offset*radInPixel
  targetLat = ((x*Math.cos(a)) + (y*Math.sin(a)) + Number(lat)) 
  targetLon = ((y*Math.cos(a)) - (x*Math.sin(a))  + Number(lon)) 

  return [targetLat, targetLon]
}

function distanceToObject(lat, lon, targetLat, targetLon) {
  return Math.sqrt(Math.pow(targetLat-lat,2)+Math.pow(targetLon-lon,2))
}
/* define polygon nodes from matched object */
function findPolygonFromObject(fov, lat, lon, imageSize, objectCoords, objectCoordsMap) {
 
  var target = targetFromObject(fov, lat, lon, imageSize, objectCoords, objectCoordsMap) 
  var targetLat = target[0]
  var targetLon = target[1]
  var distance = distanceToObject(Number(lat), Number(lon), targetLat, targetLon)
   var factor = 2.83477579755-(0.00522655115197*distance)
   if (factor<1.2) {
    factor = 1.2
   }
  //second rotate to calculate polygon coords
  x = (targetLat - Number(lat)) * factor
  y = (targetLon - Number(lon)) * factor
  a = Number(fov)/2
  var xLeft = (x*Math.cos(a)) - (y*Math.sin(a)) + Number(lat)
  var yLeft = (x*Math.sin(a)) + (y*Math.cos(a)) + Number(lon)
  var xRight = (x*Math.cos(a)) + (y*Math.sin(a)) + Number(lat)
  var yRight = (y*Math.cos(a)) - (x*Math.sin(a)) + Number(lon)

  var result = [{ 
    originLat: lat,
    originLon: lon, 
    targetLat: targetLat,
    targetLon: targetLon,
    leftLat: xLeft,
    leftLon: yLeft,
    rightLat: xRight,
    rightLon: yRight
  }]
  var rotation = findRotationFromTarget(targetLat, targetLon, lat, lon)
  return [ result, rotation ]

}

function findPolygonFromRotationAndObject(fov, rotation, lat, lon, imageSize, objectCoords, objectCoordsMap) {
  var targetO = targetFromObject(fov, lat, lon, imageSize, objectCoords, objectCoordsMap) 
  var targetLatO = targetO[0]
  var targetLonO = targetO[1]
  var distance = distanceToObject(Number(lat), Number(lon), targetLatO, targetLonO)
  var factor = 2.83477579755-(0.00522655115197*distance)
   if (factor<1.2) {
    factor = 1.2
   }
  var targetR = targetFromRotation(rotation, lat, lon, distance)
  var targetLatR = targetR[0]
  var targetLonR = targetR[1]

  var targetLat = (targetLatO + targetLatR)/2
  var targetLon = (targetLonO + targetLonR)/2

  var rotationO = findRotationFromTarget(targetLatO, targetLonO, lat, lon)
  var rotationResult = (Number(rotationO)  + (360-radToDegree(Number(rotation))))/2

  x = (targetLat - Number(lat)) * factor
  y = (targetLon - Number(lon)) * factor

  a = Number(fov)/2
  var xLeft = (x*Math.cos(a)) - (y*Math.sin(a)) + Number(lat)
  var yLeft = (x*Math.sin(a)) + (y*Math.cos(a)) + Number(lon)
  var xRight = (x*Math.cos(a)) + (y*Math.sin(a)) + Number(lat)
  var yRight = (y*Math.cos(a)) - (x*Math.sin(a)) + Number(lon)

  var result = [{ 
    originLat: lat,
    originLon: lon, 
    targetLat: targetLat,
    targetLon: targetLon,
    leftLat: xLeft,
    leftLon: yLeft,
    rightLat: xRight,
    rightLon: yRight
  }]

  return [ result, rotationResult ]

}
router.get('/survey/part1/next/:entryId?', function(req, res) {
  //save the result
  Entry.findOne({ _id: req.params.entryId }).exec(function(err, entry) {
    entry.sot.push(Number(req.query.angle))
    var timeSplit = req.query.time.split(":")
    entry.sotTime = 300-(Number(timeSplit[2])+(Number(timeSplit[1])*60))
    entry.save()
    console.log("Sot length: " + entry.sot.length)
    console.log("Sot last: " + entry.sot[entry.sot.length-1])
  })

 // console.log("From next page " + req.query.number + " " + req.query.angle)
  var objects = ['car', 'traffic light', 'stop sign', 'cat', 'tree', 'house', 'flower']
  var obs = []
  var number = Number(req.query.number) +1
  if (number==2) {
    
    obs.push('cat')
    obs.push('tree')
    obs.push('car')
  } else if (number==3) {
    obs.push('stop sign')
    obs.push('cat')
    obs.push('house')
  } else if (number==4) {
    number = "finish"
    obs.push('cat')
    obs.push('flower')
    obs.push('car')
  } else if (number==5) {
    obs.push('stop sign')
    obs.push('tree')
    obs.push('traffic light')
  } else if (number==6) {
    obs.push('stop sign')
    obs.push('flower')
    obs.push('car')
  } else if (number==7) {
    obs.push('traffic light')
    obs.push('house')
    obs.push('flower')
  } else if (number==8) {
    obs.push('house')
    obs.push('flower')
    obs.push('stop sign')
  } else if (number==9) {
    obs.push('car')
    obs.push('stop sign')
    obs.push('tree')
  } else if (number==10) {
    obs.push('traffic light')
    obs.push('cat')
    obs.push('car')
  } else if (number==11) {
    obs.push('tree')
    obs.push('flower')
    obs.push('house')
  } else if (number==12) {
    obs.push('cat')
    obs.push('house')
    obs.push('traffic light')
  } else if (number==13) {
    number = "finish"
    obs.push('')
    obs.push('')
    obs.push('')
    finish = true
  }
    res.send({
    number: number,
    ob1: obs[0],
    ob2: obs[1],
    ob3: obs[2],
    entryId: req.params.entryId
  })

  
})

/**
* Get input from client and send calculated polygon coordinates 
* 
*/
router.get('/showPolygon', function(req, res) {
  console.log("Im Server--------------------------") 
  var r = 360-Number(radToDegree(req.query.mapRotation))
  console.log("Rotation: " + r)
  var originLat = Number(JSON.parse(req.query.origin)[0])
  var originLon = Number(JSON.parse(req.query.origin)[1])
  //Calculate FOV
  // read exif data of a current image

  var buf = fs.readFileSync('C:/users/Zoe/Bachelor/public' + req.query.imagePath);      
  var parser = require('exif-parser').create(buf);
  var result = parser.parse();
  // read focal length
  var focalLength = result.tags.FocalLength
  console.log("Focal length: " + focalLength)
  var sensorWidth = 6.17
  var fov = 2*Math.atan(0.5*sensorWidth/Number(focalLength))
  // only object(s)
  if (req.query.objectCoordsMap!="y" && req.query.modalCameraRotation=="t") {
    console.log("OBJEKT OHNE ROTATION")
    var result = findPolygonFromObject(fov, originLat, originLon, req.query.imageSize, req.query.objectCoords, req.query.objectCoordsMap)
    console.log("ROTATIONNNNNNNNNNNNNNNN: " + result[1])
   } else if (req.query.modalCameraRotation=="f" && req.query.objectCoordsMap=="y") {
     console.log("Rotation ohne objekt")
    var result = findPolygonFromRotation(fov, req.query.mapRotation, originLat, originLon, focalLength)
   } else if (req.query.modalCameraRotation=="f" && req.query.objectCoordsMap!="y") {
    console.log("Rotation AND objekt")
    var result = findPolygonFromRotationAndObject(
      fov, req.query.mapRotation, 
      originLat, originLon, req.query.imageSize, 
      req.query.objectCoords, req.query.objectCoordsMap)
   } 
   console.log("Result in showPolygon: " + JSON.stringify(result))
  res.send({ 
    polygonCoords: JSON.stringify(result)
  })
});

router.post('/submitToDatabase', function(req, res) {
  console.log("RRRRRRRR: " + req.body.imagePath)
  var imageName = req.body.imagePath.split("/")[2]
  console.log("Im Server submitToDatabase") 
  var r = 360-Number(radToDegree(req.body.mapRotation))
  console.log("Rotation: " + r)
  var originLat = Number(JSON.parse(req.body.origin)[0])
  var originLon = Number(JSON.parse(req.body.origin)[1])
  var focalLength = 0
  var fov = 0
  //var wholePath = 'C:/users/Zoe/Bachelor/public' + req.body.imagePath
  var imageId = req.params.imageId
  var buf = fs.readFileSync('C:/users/Zoe/Bachelor/public' + req.body.imagePath);      
      var parser = require('exif-parser').create(buf);
      var result = parser.parse();
      // read focal length
      focalLength = Number(result.tags.FocalLength)
      var sensorWidth = 6.17
      fov = 2*Math.atan(0.5*sensorWidth/Number(focalLength))
      console.log("Values: " + req.body.multipleObjects + " " + req.body.modalCameraRotation)
  //Calculate FOV
  // read exif data of a current image
  fs.rename('C:/users/Zoe/Bachelor/public' + req.body.imagePath, 'C:/users/Zoe/Bachelor/public/db' + req.body.imagePath, function(error) {
    if (error) {
      console.log("Image upload error: " + error)
    } 
  })
 
  // only object(s)
  if (req.body.objectCoordsMap!="y" && req.body.modalCameraRotation=="t" && req.body.multipleObjects!="Yes" ) {
    console.log("OBJEKT(s) OHNE ROTATION")
    var result = findPolygonFromObject(fov, originLat, originLon, req.body.imageSize, req.body.objectCoords, req.body.objectCoordsMap)
   } else if (req.body.modalCameraRotation=="f" && req.body.objectCoordsMap=="y") {
     console.log("Rotation ohne objekt")
    var result = findPolygonFromRotation(fov, req.body.mapRotation, originLat, originLon, focalLength)
   } else if (req.body.modalCameraRotation=="f" && req.body.objectCoordsMap!="y" && req.body.multipleObjects!="Yes") {
    console.log("Rotation AND objekt")
    var result = findPolygonFromRotationAndObject(
      fov, req.body.mapRotation, 
      originLat, originLon, req.body.imageSize, 
      req.body.objectCoords, req.body.objectCoordsMap)
   } else if (req.body.multipleObjects=="Yes" && req.body.modalCameraRotation=="f") {
      console.log("Rotation AND objekts ")
      //Save to Database
      console.log("Rotation: " + req.body.mapRotation + " " + radToDegree(Number(req.body.mapRotation)))
      /* WORKING*/
      //save image in db
      var image = new MyImage({ 
          name: imageName,
          path: 'C:/users/Zoe/Bachelor/public/db/images/' + imageName,
          coords: [ Number(originLat), Number(originLon) ],
          direction: 360-radToDegree(Number(req.body.mapRotation)),
          buildings: JSON.parse(req.body.selectedBuildings)
      })

      image.save(function (err) {
        if (err) return console.error(err)
          else console.log("Image " + imageName + " is saved in database")
      });

      res.redirect("/")
      
   } else if (req.body.multipleObjects=="Yes" && req.body.modalCameraRotation=="t") {
      console.log("Only objekts ")
      var parsed = JSON.parse(req.body.objectCoordsMap)
      var targetLat = Number(parsed[0].x)
      var targetLon = Number(parsed[0].y)

      /* WORKING*/
      //save image in db
      var image = new MyImage({ 
          name: imageName,
          path: 'C:/users/Zoe/Bachelor/public/db/images/' + imageName,
          coords: [ Number(originLat), Number(originLon) ],
          direction: Number(findRotationFromTarget(targetLat, targetLon, originLat, originLon)),
          buildings: JSON.parse(req.body.selectedBuildings)
      })

      image.save(function (err) {
        if (err) return console.error(err)
          else console.log("Image " + imageName + " is saved in database")
      });

      res.redirect("/")
   }
   // Transformation 
   var point1 = [ Number(result[0][0].originLat), Number(result[0][0].originLon) ]
   var point2 = [ Number(result[0][0].leftLat), Number(result[0][0].leftLon) ]
    var point3 = [ Number(result[0][0].rightLat), Number(result[0][0].rightLon) ]
    var point4 = [ Number(result[0][0].originLat), Number(result[0][0].originLon) ]

  var coords = []
  coords.push(point1)
  coords.push(point2)
  coords.push(point3)
  coords.push(point4)
  var polygon = ""
  for (x in coords) {
    var mercator = proj4(proj4('EPSG:3857'), proj4('EPSG:4326'), coords[x])
    polygon = polygon + mercator[1] + " " + mercator[0] + " "
  }
  // send overpass request 
  var latlon = ""
  var radius = "100"
  var data = 'way(poly:"' + polygon + '")["building"];'
  var url = 'http://overpass-api.de/api/interpreter?data=[out:json];' + data + 'out geom;';
  request(
      { method: 'GET'
      , uri: url
      , gzip: true
      , lalon: latlon
      , polygon: polygon
      , imageId: imageId
      }
    , function (error, response, body) { 

      var bodyString = body
      console.log("Polygon: " + polygon)
      var buildings = findViewableBuildings(polygon, body, latlon)

      /* WORKING*/
      //save image in db
      var image = new MyImage({ 
          name: imageName,
          path: 'C:/users/Zoe/Bachelor/public/db/images/' + imageName,
          coords: [ Number(originLat), Number(originLon) ],
          direction: Number(result[1]),
          buildings: buildings
      })

      image.save(function (err) {
        if (err) return console.error(err)
          else console.log("Image " + imageName + " is saved in database")
      });



      res.redirect("/");
   // })    
    });
});


/* GET home page */
router.get('/', function(req, res) {
 // MyTestImage.findAndStreamCsv({}).pipe(fs.createWriteStream('test_images.csv'));
  Entry.findAndStreamCsv({}).pipe(fs.createWriteStream('entries.csv'));
  /*Entry.find({}).exec(function(err, entry) {
    console.log("Entry: " + entry.)
  })*/
      // Find saved images
      MyImage.find({}).exec(function(err,images) {

        var imageData = []
        for (var i=0; i<images.length; i++) {
          if (images[i].buildings.length>0) {
            imageData.push(images[i])
          }
        }

        res.render('home.ejs', { 
        coordsString: 'Home page', 
        properties: "[51.964045, 7.609542]",
        imageData: JSON.stringify(imageData)
        });
      })
      
});

  function boundingBoxAroundPolyCoords (nodes) {

          var building = ""
          var coords = []
          var lats = []
          var lons = []
          for (node in nodes) {
                var lat = nodes[node].lat
                var lon = nodes[node].lon
                coords.push([ Number(lat), Number(lon) ])
                lats.push(Number(lat))
                lons.push(Number(lon))
              }
              var maximumLat = findMax(lats);
              var maximumLon = findMax(lons);
              var minimumLat = findMin(lats);
              var minimumLon = findMin(lons);
              var fromMaxLat = [maximumLat]
              var fromMinLat = [minimumLat]
              var fromMaxLon = []
              var fromMinLon = []

              for (i in coords) {
                if (coords[i][0]==maximumLat) {
                  // to do : there can be multiple nodes with the same lat/lon
                 /* if (fromMaxLat.length==2) {
                    if (fromMaxLat[1]<coords[i][1]) {
                      fromMaxLat.pop()
                      fromMaxLat.push(coords[i][1])
                    } 
                  } else {*/
                    fromMaxLat.push(coords[i][1])
                 // }           
                } else if (coords[i][0]==minimumLat) {
                 /* if (fromMinLat.length==2) {
                    if (fromMinLat[1]<coords[i][1]) {
                      fromMinLat.pop()
                      fromMinLat.push(coords[i][1])
                    }
                  } else {*/
                    fromMinLat.push(coords[i][1])
                 // }                 
                }
                if (coords[i][1]==maximumLon) {   
               /*   if (fromMaxLon.length==2) {
                    if (fromMaxLon[0]>coords[i][0]) {
                      fromMaxLon = [ coords[i][0], maximumLon ]
                    }
                  } else {*/
                    fromMaxLon.push(coords[i][0])
                    fromMaxLon.push(maximumLon)
                 // }          
                  
                } else if (coords[i][1]==minimumLon) {
                  /*if (fromMinLon.length==2) {
                    if (fromMinLon[0]<coords[i][0]) {
                      fromMinLon = [ coords[i][0], minimumLon]
                    }
                  } else {*/
                    fromMinLon.push(coords[i][0])
                    fromMinLon.push(minimumLon)
                 // } 
                }
              }
              //bounds = boundingBoxAroundPolyCoords([coords])
              return [ fromMinLon, fromMinLat, fromMaxLon, fromMaxLat ]
  }

  function findMin( array ){
    return Math.min.apply( Math, array );
  };

  function findMax( array ){
    return Math.max.apply( Math, array );
  };

  function findViewableBuildings(polygon, body, latlon) {
    var result = JSON.parse(body).elements
    var buildings = []
    var bodyString = body
    var coords = []
    var splitPolygon = polygon.split(" ")
    var viewArea = turf.polygon([[
      [Number(splitPolygon[1]), Number(splitPolygon[0])], 
      [Number(splitPolygon[3]), Number(splitPolygon[2])], 
      [Number(splitPolygon[5]), Number(splitPolygon[4])],
      [Number(splitPolygon[1]), Number(splitPolygon[0])]
    ]]) 
    // find buildings in polygon
    // for all buildings
    for (element in result) {
      //define origin coordinates
      if (latlon!="") {
        var split = latlon.split(",")
        var lat = Number(split[0])
        var lon = Number(split[1])
      } else {
        var split = polygon.split(" ")
        var lat = Number(split[0])
        var lon = Number(split[1])
      }
      var point = turf.point([lon, lat]); //origin
      var poly1status = true
      var poly2status = true
      var poly3status = true
      var poly4status = true
      var poly5status = true
      var add = true
      var nodes = result[element].geometry //get all nodes of the building
      var building = ""
      var bounds = boundingBoxAroundPolyCoords(nodes)
      var poly1 = turf.linestring([
        [lon, lat], 
        [bounds[0][1], bounds[0][0]]
      ])
      var poly2 = turf.linestring([ 
        [lon, lat], 
                      [bounds[1][1], bounds[1][0]] 
                      ])
            var poly3 = turf.linestring([
                      [lon, lat], 
                      [bounds[2][1], bounds[2][0]] 
                      ])
            var poly4= turf.linestring([ 
                      [lon, lat], 
                      [bounds[3][1], bounds[3][0]] 
                      ])
            var poly5 = turf.linestring([ 
                      [lon, lat], 
                      [(bounds[0][1]+bounds[2][1])/2, (bounds[1][0]+bounds[3][1])/2]
                      ])

            var bbPoint1 = turf.point([bounds[0][1], bounds[0][0]])
            var bbPoint2 = turf.point([bounds[1][1], bounds[1][0]])
            var bbPoint3 = turf.point([bounds[2][1], bounds[2][0]])
            var bbPoint4 = turf.point([bounds[3][1], bounds[3][0]] )
            var bbPoint5 = turf.point([(Number(bounds.minlon)+Number(bounds.maxlon))/2, (Number(bounds.minlat)+Number(bounds.maxlat))/2])

            //check if lines intersect one of the found buildings
            for (x in result) {

              if (result[x].id != result[element].id) {
                var boundsX = boundingBoxAroundPolyCoords(result[x].geometry)

                var bbox = [
                  Number(result[x].bounds.minlon), 
                  Number(result[x].bounds.minlat), 
                  Number(result[x].bounds.maxlon), 
                  Number(result[x].bounds.maxlat)
                ];
           
                var nodesX = result[x].geometry
                
                    var coordsX = []
                    for (node in nodesX) {
                      var lat = Number(nodesX[node].lat)
                      var lon = Number(nodesX[node].lon)
                      coordsX.push([lon,lat])               
                    }
                    coords.push(coords[0])
                try { 
                  var poly = turf.polygon([coordsX])
                } catch(err) {
                  console.log("TURF ERROR: " + err)
                  break
                }
                if (poly1status) {
                    var intersection1 = turf.intersect(poly1, poly)

                    if (intersection1!=undefined) {
                      if (intersection1.geometry.type!="Point") {
                        poly1status = false
                      }
                  } else if (!(turf.inside(bbPoint1,viewArea))) {
                    poly1status = false
                  }

                }
                if (poly2status) {
                   var intersection2 = turf.intersect(poly2, poly)
                  if (intersection2!=undefined) {
                       if (intersection2.geometry.type!="Point") {
                        poly2status = false
                      }
                  } else if (!turf.inside(bbPoint2,viewArea)) {
                    poly2status = false
                  }
                }
                if (poly3status) {
                  var intersection3 = turf.intersect(poly3, poly)
                 if (intersection3!=undefined) {
                     if (intersection3.geometry.type!="Point") {
                        poly3status = false
                      }
                     
                  } else if (!turf.inside(bbPoint3,viewArea)) {
                    poly3status = false
                  }
                }
                if (poly4status) {
                   var intersection4 = turf.intersect(poly4, poly)
                 if (intersection4!=undefined) {
                     if (intersection4.geometry.type!="Point") {
                        poly4status = false
                      }
                  } else if (!turf.inside(bbPoint4,viewArea)) {
                    poly4status = false
                  }
                }
                if (poly5status) {
                  var intersection5 = turf.intersect(poly5, poly)
                  if (intersection5!=undefined) {
                     if (intersection5.geometry.type!="Point") {
                        poly5status = false
                      }
                  } else if (!turf.inside(bbPoint5,viewArea)) {
                    poly5status = false
                  }
                }

                if ((poly1status==false) && (poly2status==false) && (poly3status==false) && (poly4status==false) && (poly5status==false)) {
                  add = false
                  break
                } 
                 
              }
            }
            if (add) {
              //console.log("I'm element " + result[element].id) sonne
              var geometry = []
              for (node in nodes) {
                    var lat = Number(nodes[node].lat)
                    var lon = Number(nodes[node].lon)
                    var oneNode = proj4(proj4('EPSG:4326'), proj4('EPSG:3857'), [ lon, lat ])
                    //building =  building + lat + " " + lon + ":"
                    geometry.push(oneNode)
              }
                  buildings.push({ id: result[element].id, geometry: [geometry] }) 
            }  
          }

          return buildings

  }
/* GET nodes, ways and relations inside a triangle polygon */
router.post('/overpass', function(req, res) {
  console.log("Rotation in overpass: " + req.body.mapRotation)
  var latlon = ""
  var polygon = ""
  var radius = "100"
  if (req.body.polyCoords!="x") {
    var polygon = req.body.polyCoords
    var data = 'way(poly:"' + polygon + '")["building"];'
    
  } else {
    radius = req.body.radius
    var latlon = req.body.properties.slice(1, req.body.properties.length-1)
    console.log("DATAAAAAAAAAAAAAAA: " + latlon + " " + radius)
    var data = 'way(around:' + radius + ',' + latlon +  ')["building"];'
  }
  var url = 'http://overpass-api.de/api/interpreter?data=[out:json];' + data + 'out geom;';
  request(
      { method: 'GET'
      , uri: url
      , gzip: true
      , lalon: latlon
      , polygon: polygon
      }
    , function (error, response, body) { 
      if (error) {
        console.log("Error from overpass: " + error)
      }
      //get lat and lon from URL
      var result = JSON.parse(body).elements
      var buildings = []
      var bodyString = body
      var coords = []
      if (polygon=="") {
        for (element in result) {          
          var nodes = result[element].geometry
          //var building = ""
          var geometry = []
              for (node in nodes) {
                    var lat = Number(nodes[node].lat)
                    var lon = Number(nodes[node].lon)
                    var oneNode = proj4(proj4('EPSG:4326'), proj4('EPSG:3857'), [ lon, lat ])
                    //building =  building + lat + " " + lon + ":"
                    geometry.push(oneNode)
              }
                  buildings.push({ id: result[element].id, geometry: [geometry] }) 

              /*bounds = boundingBoxAroundPolyCoords([coords])
              var bounds = boundingBoxAroundPolyCoords(nodes)
              //Display bounding boxen
              var building = ""
              for (i in bounds) {
                building =  building + bounds[i][0] + " " + bounds[i][1] + ":"
              }*/
              //building = bounds.minlat + " " + bounds.minlon + ":" + bounds.maxlat + " " + bounds.maxlon + ":"

        }
      } else {
        buildings = findViewableBuildings(polygon, body, latlon)
        //console.log(JSON.stringify(buildings))  
      }

      res.render("image.ejs", {
        //data: JSON.stringify(JSON.parse(body), null, 4)
        imagePath: req.body.imagePath,
        properties: req.body.properties,
        buildingCoords: JSON.stringify(buildings),
        building: true,
        radius: radius,
        bodyString: bodyString,
        rotation: req.body.mapRotation,
        icon: req.body.icon
      });
   // })    
    });
}); 


/* Upload an image */
router.post('/upload', function(req, res) {
  var serverPath = '/images/' + req.file.originalname;
  //working saving 
console.log("Upload: " + req.file.path)
  fs.rename(req.file.path, 'C:/users/Zoe/Bachelor/public' + serverPath, function(error) {
    if (error) {
      res.send({
        error: 'Ah crap! Something bad happened'
      });
      return;
    } else {
      // read exif
      var buf = fs.readFileSync('C:/users/Zoe/Bachelor/public' + serverPath);      
      var parser = require('exif-parser').create(buf);
      var result = parser.parse();

  
      var dec = [ result.tags.GPSLatitude, result.tags.GPSLongitude ]

      //res.send(exifData)
      res.render('image.ejs', { 
        imagePath: serverPath,
        //gps: GPSLatitude, GPSLongitude           
        properties: JSON.stringify(dec),
        building: false,
        radius: "100",
        rotation: '0',
        icon: '"Point"'
        // data: JSON.stringify(dec)
      });




      } 
    });
                     
  });



module.exports = router;
