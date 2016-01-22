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
var fs = require('fs');
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

router.get('/survey', function(req, res) {
  var names = [
  126966710,
    //126807950,
    126910684,
    126807944
  ]
  var x = Math.floor((Math.random() * 3));
  /*
  if (!req.query.nextImage) {
    var image = 0
  } else {
    var image = req.query.nextImage
  }
  */
  // read exif
  
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
    modal: false
  });
});

router.get('/survey/part1', function(req, res) {
  res.render('part1.ejs');
});

router.post('/submitForm', function(req, res) {
  res.redirect('/survey/part1');
});

router.get('/survey/part2', function(req, res) {
  res.render('part2.ejs');
});

router.get('/thanks', function(req, res) {
  res.render('thanks.ejs');
});
/* Render different pages depending for the survey 
*  there are 2 tests:
*  test 1: display camera marker
*  test 2: display flag marker and buildings
*/
router.post('/survey/next', function(req, res) {
  var array = req.body.nextImage.split(" ") 
  if (array.length==3 && req.body.test=="2") {
    console.log("R E D I R E C T")
    res.redirect("/thanks")
  } else {
  console.log("V  A  L  U  E  S  ___________________________________________")
  console.log("nextImage " + req.body.nextImage)
  console.log("mapRotation " + req.body.mapRotation)
  console.log("lat " + req.body.lat)
  console.log("lon " + req.body.lon)
  console.log("test " + req.body.test)
  console.log("known " + req.body.known + " " + req.body.knownModal)
  console.log("COmputer skills: " + req.body.computerSkills + " " + req.body.inputName)
  var modal = false
  var test = ""                               // test number (1 to 4)
  var next = ""                               // files which have alredy been tested
  var names = []                              // file names
   // files that have been tested already
  var showBuilding = false                    // if true, buildings in a certain radius will be displayed
  var arrow = "no"                            // type of a marker (no, flag or camera)
  var all = "false"                           // if true, bounding box on image will be disabled 
  if (array.length==2) {
    modal = true
  }
  //go to the next test if 3 images proceeded
  if (array.length==3 && req.body.test=="1") {
    test = "2"
    array = []
  } else {
    test = req.body.test
    next = req.body.nextImage
  }
  // define file names for each test
  if (test=="1") {
    names = [
    //126807950, 
    126966710, //USED FOR DEMOS ONLY
    126910684,
    126807944
    ]
    arrow = "arrow";
  } else if (test=="2") {
     names = [
      //125965583,
      126966710, //USED FOR DEMOS ONLY
      126810608,
      126810619
    ]
    arrow = '"Point"'
    showBuilding = true
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
          var building = ""
          for (node in nodes) {
                var lat = nodes[node].lat
                var lon = nodes[node].lon
                building =  building + lat + " " + lon + ":"
              }

              buildings.push({ id: result[element].id, geometry: building }) 
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
          all: all,
          modal: modal
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
router.get('/survey/part1/start', function(req, res) {
  res.render('sot.ejs');
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
  console.log("Distance: " + distance)
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

  return result1
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
    console.log("Case 1")
    var rad1 = Math.acos(lat/distance)
    var rad2 = Math.asin(-lon/distance)
    var rad = 3.1415926536-((rad1+rad2)/2)+1.5707963268
    return radToDegree(rad) 
  } else if ((targetLat<=ix) && (targetLon<=iy)) {
    console.log("Case 2")
    var rad1 = Math.acos(-lat/distance)
    var rad2 = Math.asin(-lon/distance)
    var rad = ((rad1+rad2)/2)+1.5707963268
    return radToDegree(rad) 
  } else if ((targetLat>=ix) && (targetLon>=iy)) {
    console.log("Case 3")
    var rad1 = Math.acos(lat/distance)
    var rad2 = Math.asin(lon/distance)
    var rad = 3.1415926536+((rad1+rad2)/2)+1.5707963268
    return radToDegree(rad) 
  }  else if ((targetLat<=ix) && (targetLon>=iy)) {
    console.log("Case 4")
    var rad1 = Math.acos(-lat/distance)
    var rad2 = Math.asin(lon/distance)
    var rad = 6.2831853072-((rad1+rad2)/2) + 1.5707963268
    return radToDegree(rad) 
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
   console.log("DISTANCE TO OBJECT: " + distance)
   var factor = 2.83477579755-(0.00522655115197*distance)
   if (factor<1.2) {
    factor = 1.2
   }
   console.log("Factor: " + factor)
  //second rotate to calculate polygon coords
  x = (targetLat - Number(lat)) * factor
  y = (targetLon - Number(lon)) * factor
  a = Number(fov)/2
  var xLeft = (x*Math.cos(a)) - (y*Math.sin(a)) + Number(lat)
  var yLeft = (x*Math.sin(a)) + (y*Math.cos(a)) + Number(lon)
  var xRight = (x*Math.cos(a)) + (y*Math.sin(a)) + Number(lat)
  var yRight = (y*Math.cos(a)) - (x*Math.sin(a)) + Number(lon)

  var result = { 
    originLat: lat,
    originLon: lon, 
    targetLat: targetLat,
    targetLon: targetLon,
    leftLat: xLeft,
    leftLon: yLeft,
    rightLat: xRight,
    rightLon: yRight
  }
  var rotation = findRotationFromTarget(targetLat, targetLon, lat, lon)
  console.log("Rotation from o : " + rotation)
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
  var rotationResult = (Number(rotationO)  + radToDegree(Number(rotation)))/2
  console.log("Result rotation: " + rotationO + " " + radToDegree(Number(rotation)) + " " + rotationResult)

  x = (targetLat - Number(lat)) * factor
  y = (targetLon - Number(lon)) * factor
  console.log("x,y " + x + " " + y)

  a = Number(fov)/2
  var xLeft = (x*Math.cos(a)) - (y*Math.sin(a)) + Number(lat)
  var yLeft = (x*Math.sin(a)) + (y*Math.cos(a)) + Number(lon)
  var xRight = (x*Math.cos(a)) + (y*Math.sin(a)) + Number(lat)
  var yRight = (y*Math.cos(a)) - (x*Math.sin(a)) + Number(lon)

  var result = { 
    originLat: lat,
    originLon: lon, 
    targetLat: targetLat,
    targetLon: targetLon,
    leftLat: xLeft,
    leftLon: yLeft,
    rightLat: xRight,
    rightLon: yRight
  }

  return [ result, rotationResult ]

}
router.get('/survey/part1/next', function(req, res) {
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
    ob3: obs[2]
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
  console.log(buf)
  var result = parser.parse();
  // read focal length
  var focalLength = result.tags.FocalLength
  console.log("Focal length: " + focalLength)
  var sensorWidth = 6.17
  var fov = 2*Math.atan(0.5*sensorWidth/Number(focalLength))
  console.log(fov)
  // only object(s)
  if (req.query.objectCoordsMap!="y" && req.query.modalCameraRotation=="t") {
    console.log("OBJEKT OHNE ROTATION")
    var result = findPolygonFromObject(fov, originLat, originLon, req.query.imageSize, req.query.objectCoords, req.query.objectCoordsMap)
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
  res.send({ 
    polygonCoords: JSON.stringify(result)
  })
});

router.post('/submitToDatabase', function(req, res) {



  console.log("Im Server submitToDatabase") 
  var r = 360-Number(radToDegree(req.body.mapRotation))
  console.log("Rotation: " + r)
  var originLat = Number(JSON.parse(req.body.origin)[0])
  var originLon = Number(JSON.parse(req.body.origin)[1])
  var wholePath = 'C:/users/Zoe/Bachelor/public' + req.body.imagePath
  //Calculate FOV
  // read exif data of a current image

  var buf = fs.readFileSync('C:/users/Zoe/Bachelor/public' + req.body.imagePath);      
  var parser = require('exif-parser').create(buf);
  console.log(buf)
  var result = parser.parse();
  // read focal length
  var focalLength = result.tags.FocalLength
  console.log("Focal length: " + focalLength)
  var sensorWidth = 6.17
  var fov = 2*Math.atan(0.5*sensorWidth/Number(focalLength))
  console.log(fov)
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
      MyImage.findOne({ path: wholePath }).exec(function(err, myImage) {
        myImage.direction = Number(req.body.mapRotation)
        myImage.buildings = JSON.parse(req.body.selectedBuildings)
        myImage.save()
      })
      res.redirect("/")
   } else if (req.body.multipleObjects=="Yes" && req.body.modalCameraRotation=="t") {
      console.log("Only objekts ")
      var parsed = JSON.parse(req.body.objectCoordsMap)
      var targetLat = Number(parsed[0].x)
      var targetLon = Number(parsed[0].y)
      //Save to Database
      MyImage.findOne({ path: wholePath }).exec(function(err, myImage) {
        myImage.direction = Number(findRotationFromTarget(targetLat, targetLon, originLat, originLon))
        myImage.buildings = JSON.parse(req.body.selectedBuildings)
        myImage.save()
        console.log("Dir : " + myImage.direction)
      })
      
      res.redirect("/")
   }
   var point1 = [ Number(result[0].originLat), Number(result[0].originLon) ]
    var point2 = [ Number(result[0].leftLat), Number(result[0].leftLon) ]
    var point3 = [ Number(result[0].rightLat), Number(result[0].rightLon) ]
    var point4 = [ Number(result[0].originLat), Number(result[0].originLon) ]

  var coords = []
  coords.push(point1)
  coords.push(point2)
  coords.push(point3)
  coords.push(point4)
  var polyCoords = ""
  for (x in coords) {
    var mercator = proj4(proj4('EPSG:3857'), proj4('EPSG:4326'), coords[x])
    polyCoords = polyCoords + mercator[1] + " " + mercator[0] + " "
  }
  console.log("Mercator: " + polyCoords)
  // send overpass request 
});


/* GET home page */
router.get('/', function(req, res) {

      res.render('home.ejs', { 
        coordsString: 'Home page', 
        properties: "[51.964045, 7.609542]",

        });
});

function intersectLineBBox(line, bbox) {
   var result = "not intersected"
   var segments = []
   var bbPoints = []
/*
     // top
   segments[0] = [[bbox[0], bbox[3]], [bbox[2], bbox[3]]];
   // bottom
   segments[1] = [[bbox[0], bbox[1]], [bbox[2], bbox[1]]];
   // left
   segments[2] = [[bbox[0], bbox[1]], [bbox[0], bbox[3]]];
   // right
   segments[3] = [[bbox[2], bbox[3]], [bbox[2], bbox[1]]];
*/
   // top
   segments[0] = [[bbox[0][1], bbox[0][0]], [bbox[1][1], bbox[1][0]]];
   // bottom
   segments[1] = [[bbox[1][1], bbox[1][0]], [bbox[2][1], bbox[2][0]]];
   // left
   segments[2] = [[bbox[2][1], bbox[2][0]], [bbox[3][1], bbox[3][0]]];
   // right
   segments[3] = [[bbox[3][1], bbox[3][0]], [bbox[0][1], bbox[0][0]]];
   ax1,ay1,ax2,ay2,bx1,by1,bx2,by2

   var ax1 = line[0][0]
   var ay1 = line[0][1]
   var ax2 = line[1][0]
   var ay2 = line[1][1]

   for (i in segments) {
    if (bbPoints.length>1) {
      break
    }
    var bx1 = segments[i][0][0]
    var by1 = segments[i][0][1]
    var bx2 = segments[i][1][0]
    var by2 = segments[i][1][1]
    
    /*var v1=(bx2-bx1)*(ay1-by1)-(by2-by1)*(ax1-bx1);
    var v2=(bx2-bx1)*(ay2-by1)-(by2-by1)*(ax2-bx1);
    var v3=(ax2-ax1)*(by1-ay1)-(ay2-ay1)*(bx1-ax1);
    var v4=(ax2-ax1)*(by2-ay1)-(ay2-ay1)*(bx2-ax1);
    var intersection = (v1*v2<0) && (v3*v4<0);
    if (intersection) {
      result = "intersected"
      break
    }*/
    ua_t = (bx2 - bx1) * (ay1 - by1) - (by2 - by1) * (ax1 - bx1),
    ub_t = (ax2 - ax1) * (ay1 - by1) - (ay2 - ay1) * (ax1 - bx1),
    u_b = (by2 - by1) * (ax2 - ax1) - (bx2 - bx1) * (ay2 - ay1);
        if (u_b != 0) {
          var ua = ua_t / u_b,
            ub = ub_t / u_b;
          if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
            var coord1 = ax1 + ua * (ax2 - ax1)
            var coord2 = ay1 + ua * (ay2 - ay1)
/*
            var latlon1 = new LatLon(ay2, ax2, LatLon.datum.WGS84)
            var latlon2 = new LatLon(coord2, coord1, LatLon.datum.WGS84)
            var dist2 = latlon1.distanceTo(latlon2)
            var dist = Math.sqrt(Math.pow(ax2-coord1,2)+Math.pow(ay2-coord2,2))
            console.log("DISTANCE FROM COORDS::________________ " + dist2) */

            bbPoints.push(new LatLon(coord2, coord1, LatLon.datum.WGS84))

            /*if (dist2>1) {
              result = "intersected"
              break
            }*/
            /*
            intersects.push({
              'type': 'Point',
              'coordinates': [ax1 + ua * (ax2 - ax1), ay1 + ua * (ay2 - ay1)]
            });*/
           
          } 
        }}
  if (bbPoints.length<2) {
    result = "not intersected"
   } else if (bbPoints[0].distanceTo(bbPoints[1])>1) {
    result = "intersected"
   }
   return result
}

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
/* GET nodes, ways and relations inside a triangle polygon */
router.post('/overpass', function(req, res) {
  const p0 = [[0,0], [1,0], [1,1]];
  const p1 = [[0.5,0.5], [1.5,0.5], [1.5,1.5]];
  console.log("PO: " + po.overlap(p0,p1))
  console.log("Rotation: +++++++++++++++++++++++++++++++ " + req.body.mapRotation )
  var radius = "100"
  var latlon = ""
  var polygon = ""
  // 51.964112, 7.612124, 51.964059, 7.614774, 51.962793, 7.613277
  //var polygon = "51.964112 7.612124 51.964059 7.614774 51.962793 7.613277"
  if (req.body.polyCoords!="x") {
    var polygon = req.body.polyCoords
    console.log("Polygon in overpass: " + req.body.polyCoords)
    var data = 'way(poly:"' + polygon + '")["building"];'
  } else {
    radius = req.body.radius
    var latlon = req.body.properties.slice(1, req.body.properties.length-1)
    var data = 'way(around:' + radius + ',' + latlon +  ')["building"];'
  }
  //var data = 'way(poly:"51.962034 7.626290 51.961175 7.627492")["building"];'
  var url = 'http://overpass-api.de/api/interpreter?data=[out:json];' + data + 'out geom;';

  request(
      { method: 'GET'
      , uri: url
      , gzip: true
      , lalon: latlon
      , polygon: polygon
      }
    , function (error, response, body) {

      //get lat and lon from URL
      var result = JSON.parse(body).elements
      var buildings = []
      var bodyString = body
      var coords = []
      //console.log("splitPolygon: " + splitPolygon[0] + " " + splitPolygon[1])
      /*var test = ""
      var testId = ""*/
      if (polygon=="") {
        for (element in result) {          
          var nodes = result[element].geometry
          var building = ""
          for (node in nodes) {
                var lat = nodes[node].lat
                var lon = nodes[node].lon
                building =  building + lat + " " + lon + ":"
                coords.push([Number(lat), Number(lon)])
              }
              bounds = boundingBoxAroundPolyCoords([coords])
              var bounds = boundingBoxAroundPolyCoords(nodes)
              /*var building = ""
              for (i in bounds) {
                building =  building + bounds[i][0] + " " + bounds[i][1] + ":"
              }*/
              //building = bounds.minlat + " " + bounds.minlon + ":" + bounds.maxlat + " " + bounds.maxlon + ":"
              
              buildings.push({ id: result[element].id, geometry: building }) 
        }
      } else {


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
            //console.log("Origin: " + lon + " " +lat + " " + turf.inside(point,viewArea))
            /*lat = 51.962146
            lon = 7.626533*/

            var poly1status = true
            var poly2status = true
            var poly3status = true
            var poly4status = true
            var poly5status = true

            var add = true
            var nodes = result[element].geometry //get all nodes of the building
            var building = ""
            //testId = result[element].id
            
            //var bounds = result[element].bounds // get bounding box of the building
            var bounds = boundingBoxAroundPolyCoords(nodes)
            // create line which connect origin with all bounding box nodes
           /* var poly1 = [[lon, lat], [bounds[0][1], bounds[0][0]] ] 
            var poly2 = [[lon, lat], [bounds[1][1], bounds[1][0]] ] 
            var poly3 = [[lon, lat], [bounds[2][1], bounds[2][0]] ] 
            var poly4 = [[lon, lat], [bounds[3][1], bounds[3][0]] ] 
            var poly5 = [[lon, lat], [(bounds[0][1]+bounds[2][1])/2, (bounds[1][0]+bounds[3][1])/2]]*/


            /*var poly1 = [[lon, lat], [Number(bounds.minlon), Number(bounds.minlat)]]           
            var poly2 = [[lon, lat], [Number(bounds.maxlon), Number(bounds.maxlat)]]                
            var poly3 = [[lon, lat], [Number(bounds.maxlon), Number(bounds.minlat)]]         
            var poly4 = [[lon, lat], [Number(bounds.minlon), Number(bounds.maxlat)]]
            var poly5 = [[lon, lat], 
            [(Number(bounds.minlon)+Number(bounds.maxlon))/2, (Number(bounds.minlat)+Number(bounds.maxlat))/2]]*/
            

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
/*
            var bbPoint1 = turf.point([Number(bounds.minlon), Number(bounds.minlat)])
            var bbPoint2 = turf.point([Number(bounds.maxlon), Number(bounds.maxlat)])
            var bbPoint3 = turf.point([Number(bounds.maxlon), Number(bounds.minlat)])
            var bbPoint4 = turf.point([Number(bounds.minlon), Number(bounds.maxlat)])
            var bbPoint5 = turf.point([(Number(bounds.minlon)+Number(bounds.maxlon))/2, (Number(bounds.minlat)+Number(bounds.maxlat))/2])
*/  
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
                //console.log("intersected? " + wgs.intersectLineBBox(poly1, bbox))
              // var poly = turf.bboxPolygon(bbox);
                
                
                var nodesX = result[x].geometry
                
                    var coordsX = []
                    for (node in nodesX) {
                      var lat = Number(nodesX[node].lat)
                      var lon = Number(nodesX[node].lon)
                      coordsX.push([lon,lat])               
                    }
                    coords.push(coords[0])
                  //  console.log("First: " + coords[0] + " " + coords[coords.length-1])
                try { 
                  var poly = turf.polygon([coordsX])
                } catch(err) {
                  console.log("TURF ERROR: " + err)
                  break
                }
                //coordsX = [ [bbox[0], bbox[1] ], [ bbox[2],bbox[3] ] ]

                // if origin is not inside the boundign box of the building
                if (!(turf.inside(point,poly))) {

                if (poly1status) {
                 /* console.log("turf " + turf.intersect(poly1, poly) + " " + typeof(turf.intersect(poly1, poly)))
                  var we2 = turf.intersect(poly1, poly)!=undefined
                  var we3 = turf.intersect(poly1, poly)!="undefined"

                  console.log("true? " +  we2 + " " + we3)*/
                 // if (po.overlap(poly1,coordsX)) {
                    //if (intersectLineBBox(poly1,boundsX)=="intersected") {
                    var intersection1 = turf.intersect(poly1, poly)

                    if (intersection1!=undefined) {
                   //   console.log("Inter: " + JSON.stringify(intersection1))
                      if (intersection1.geometry.type!="Point") {
                        poly1status = false
                      }
                    //console.log("coords[0] " + turf.intersect(poly1x, poly).geometry.coordinates[0])
                    
                    if (result[element].id=="100219948") {
                    console.log("Großes Gebueude intersects " + result[x].id + " mit point 1")
                    console.log("Intersection: " + turf.intersect(poly1, poly))
                  } else if (result[element].id=="251664274") {
                    console.log("Kleines Gebueude intersects " + result[x].id + " mit point 1")
                    console.log("Point 1 in dreieck?: " + turf.inside(bbPoint1,viewArea))
                  }
                  } else if (!(turf.inside(bbPoint1,viewArea))) {
                    poly1status = false
                  }

                }
                if (poly2status) {
                   var intersection2 = turf.intersect(poly2, poly)
                  if (intersection2!=undefined) {
                   // console.log("Inter: " + JSON.stringify(intersection2))
                       if (intersection2.geometry.type!="Point") {
                        poly2status = false
                      }
                     if (result[element].id=="100219948") {
                    console.log("Großes Gebueude intersects " + result[x].id + " mit point 2")
                    console.log("Intersection: " + turf.intersect(poly2, poly))
                  } else if (result[element].id=="251664274") {
                    console.log("Kleines Gebueude intersects " + result[x].id + " mit Point 2")
                    console.log("Point 2 in dreieck?: " + turf.inside(bbPoint2,viewArea))
                  }
                  } else if (!turf.inside(bbPoint2,viewArea)) {
                    poly2status = false
                  }
                }
                if (poly3status) {
                  var intersection3 = turf.intersect(poly3, poly)
                 if (intersection3!=undefined) {
                 // console.log("Inter: " + JSON.stringify(intersection3).geometry.type)
                     if (intersection3.geometry.type!="Point") {
                      if (result[element].id=="100219948") {
                    console.log("Großes Gebueude intersects " + result[x].id + " mit point 3")
                    console.log("Intersection: 3" + JSON.stringify(intersection3.geometry.type))
                    console.log(typeof(intersection3.geometry.type))
                    console.log(JSON.stringify(intersection3.geometry.type)=='"Point"')
                    console.log(intersection3.geometry.type=="Point")

                  }
                        poly3status = false
                      }
                     
                  } else if (!turf.inside(bbPoint3,viewArea)) {
                    poly3status = false
                  }
                }
                if (poly4status) {
                   var intersection4 = turf.intersect(poly4, poly)
                 if (intersection4!=undefined) {
                 // console.log("Inter: " + JSON.stringify(intersection4))
                     if (intersection4.geometry.type!="Point") {
                        poly4status = false
                      }
                    if (result[element].id=="100219948") {
                    console.log("Großes Gebueude intersects " + result[x].id + " mit point 4")
                    console.log("Intersection: " + turf.intersect(poly4, poly))
                  } else if (result[element].id=="251664274") {
                    console.log("Kleines Gebueude intersects " + result[x].id + " mit Point 4")
                    console.log("Point 4 in dreieck?: " + turf.inside(bbPoint4,viewArea))
                  }
                  }else if (!turf.inside(bbPoint4,viewArea)) {
                    poly4status = false
                  }

                }
                if (poly5status) {
                  var intersection5 = turf.intersect(poly5, poly)
                  if (intersection5!=undefined) {
                //    console.log("Inter: " + JSON.stringify(intersection5))
                     if (intersection5.geometry.type!="Point") {
                        poly5status = false
                      }
                    if (result[element].id=="100219948") {
                    console.log("Großes Gebueude intersects " + result[x].id + " mit point 5")
                    console.log("Intersection: " + turf.intersect(poly5, poly))
                  } else if (result[element].id=="251664274") {
                    console.log("Kleines Gebueude intersects " + result[x].id + " mit Point 5")
                    console.log("Point 5 in dreieck?: " + turf.inside(bbPoint5,viewArea))
                  }
                  } else if (!turf.inside(bbPoint5,viewArea)) {
                    poly5status = false
                  }
                }

                if ((poly1status==false) && (poly2status==false) && (poly3status==false) && (poly4status==false) && (poly5status==false)) {
                  add = false
                  break
                } 
                } else {
                    var poly1x = turf.linestring([
                      [lon, lat], 
                      [Number(bounds.minlon), Number(bounds.minlat)]
                      ])
                    var poly2x = turf.linestring([ 
                      [lon, lat], 
                      [Number(bounds.maxlon), Number(bounds.maxlat)]
                      ])
                    var poly3x = turf.linestring([
                      [lon, lat], 
                      [Number(bounds.minlat), Number(bounds.maxlon)]
                      ])
                    var poly4x = turf.linestring([ 
                      [lon, lat], 
                      [Number(bounds.minlon), Number(bounds.maxlat)]
                      ])
                    var poly5x = turf.linestring([ 
                      [lon, lat], 
                      [(Number(bounds.minlon)+Number(bounds.maxlon))/2, (Number(bounds.minlat)+Number(bounds.maxlat))/2]
                      ])
                    var nodesX = result[x].geometry
                    var coordsX = []
                    for (node in nodesX) {
                      var lat = Number(nodesX[node].lat)
                      var lon = Number(nodesX[node].lon)
                      coordsX.push([lon,lat])               
                    }
                    var poly = turf.polygon([coordsX])
                    if (poly1status) {
                      try {
                      var intersection1 = turf.intersect(poly1x, poly);

                      if (intersection1!=undefined) {
                        poly1status = false
                      }
                      } catch(err) {
                        console.log(err)
                        }
                    }
                    if (poly2status) {
                      try {
                      var intersection2 = turf.intersect(poly2x, poly);
                      if (intersection2!=undefined) {
                        poly2status = false
                      }
                      } catch(err) {
                        console.log(err)
                        }
                    }
                    if (poly3status) {
                      try {
                      var intersection3 = turf.intersect(poly3x, poly);
                      if (intersection3!=undefined) {
                        poly3status = false
                      }
                      } catch(err) {
                        console.log(err)
                        }
                    }
                    if (poly4status) {
                      try {
                      var intersection4 = turf.intersect(poly4x, poly);
                      if (intersection4!=undefined) {
                        poly4status = false
                      }
                      } catch(err) {
                        console.log(err)
                        }
                    }
                    if (poly5status) {
                      try {
                      var intersection5 = turf.intersect(poly5x, poly);
                      if (intersection5!=undefined) {
                        poly5status = false
                      }
                      } catch(err) {
                        console.log(err)
                        }
                    }
                    if ((poly1status==false) && (poly2status==false) && (poly3status==false) && (poly4status==false) && (poly5status==false)) {
                    add = false
                    break
                    } 
                }

              }
            }
            if (add) {
              //console.log("I'm element " + result[element].id)
              for (node in nodes) {
                    var lat = nodes[node].lat
                    var lon = nodes[node].lon
                    building =  building + lat + " " + lon + ":"
                  }
                  buildings.push({ id: result[element].id, geometry: building }) 
            }  
          }         
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

/* WORKING*/
//save image in db
var image = new MyImage({ 
    name: req.file.originalname,
    path: 'C:/users/Zoe/Bachelor/public' + serverPath,
    coords: dec })

  image.save(function (err) {
    if (err) return console.error(err)
      else console.log("Saved in database")
  });


      } 
    });
                     
  });



module.exports = router;
