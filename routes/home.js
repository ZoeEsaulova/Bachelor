var express = require('express');
var async = require('async');
var router = express.Router();
var MyImage = require('../models/image');
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
var wgs = require('WGS84IntersectUtil'); 
var gju = require('geojson-utils');


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
*  there are 4 tests:
*  test 1: display camera marker
*  test 2: display flag marker and buildings
*  test 3: display camera marker and buildings
*  test 4: display flag marker and buildings, disable bounding box on image
*/
router.post('/survey/next', function(req, res) {
  var array = req.body.nextImage.split(" ") 
  if (array.length==3 && req.body.test=="4") {
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
  } else if (array.length==3 && req.body.test=="2") {
    test = "3"
    array = []
  } else if (array.length==3 && req.body.test=="3") {
    test = "4"
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
    arrow = "point"
    showBuilding = true
  } else if (test=="3") {
     names = [
      //126910529,
      126966710, //USED FOR DEMOS ONLY
      126910521,
      126910508
    ]
    arrow = "arrow"
    showBuilding = true
  } else if (test=="4") {
     names = [
      //126910693,
      126966710, //USED FOR DEMOS ONLY
      126910706,
      126807938
    ]
    arrow = "point"
    showBuilding = true
    all = "true"
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
  } else if (req.params.test=="3") {
    //var url = "https://www.dropbox.com/s/ab72878kgaqs4f4/video1.mp4?dl=1"
    var url = "http://www.youtube.com/embed/oSYHyz_kiNQ?autoplay=0"
  } else {
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
function findPolygonFromRotation(fov, rotation, tlat, tlon) {
  var distance = 300
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

  //second rotate to calculate polygon coords
  x = (targetLat - Number(lat)) * 1.5
  y = (targetLon - Number(lon)) * 1.5
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

  var targetR = targetFromRotation(rotation, lat, lon, distance)
  var targetLatR = targetR[0]
  var targetLonR = targetR[1]

  var targetLat = (targetLatO + targetLatR)/2
  var targetLon = (targetLonO + targetLonR)/2

  var rotationO = findRotationFromTarget(targetLatO, targetLonO, lat, lon)
  var rotationResult = (Number(rotationO)  + radToDegree(Number(rotation)))/2
  console.log("Result rotation: " + rotationO + " " + radToDegree(Number(rotation)) + " " + rotationResult)

  x = (targetLat - Number(lat)) * 1.5
  y = (targetLon - Number(lon)) * 1.5
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
  console.log("ImagePath: " + req.query.imagePath) 
  var originLat = Number(JSON.parse(req.query.origin)[0])
  var originLon = Number(JSON.parse(req.query.origin)[1])
  //Calculate FOV
  // read exif data of a current image

  var buf = fs.readFileSync('C:/users/Zoe/Bachelor/public' + req.query.imagePath);      
  var parser = require('exif-parser').create(buf);
  var result = parser.parse();
  //console.log("EXIF: _____________________________________ ")
  // read focal length
  var focalLength = result.tags.FocalLength
  console.log(focalLength)
  var sensorWidth = 6.17
  var fov = 2*Math.atan(0.5*sensorWidth/Number(focalLength))
  console.log(fov)
  if (req.query.objectCoordsMap!="y" && req.query.modalCameraRotation=="t") {
    console.log("OBJEKT OHNE ROTATION")
    var result = findPolygonFromObject(fov, originLat, originLon, req.query.imageSize, req.query.objectCoords, req.query.objectCoordsMap)
   } else if (req.query.modalCameraRotation=="f" && req.query.objectCoordsMap=="y") {
     console.log("Rotation ohne objekt")
    var result = findPolygonFromRotation(fov, req.query.mapRotation, originLat, originLon)
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




/* GET home page */
router.get('/', function(req, res) {

      res.render('home.ejs', { 
        coordsString: 'Home page', 
        properties: "[51.964045, 7.609542]",

        });
});

function intersectLineBBox(line, bbox) {
   var result = "not intersected"
   var segments = [];
     // top
   segments[0] = [[bbox[0], bbox[3]], [bbox[2], bbox[3]]];
   // bottom
   segments[1] = [[bbox[0], bbox[1]], [bbox[2], bbox[1]]];
   // left
   segments[2] = [[bbox[0], bbox[1]], [bbox[0], bbox[3]]];
   // right
   segments[3] = [[bbox[2], bbox[3]], [bbox[2], bbox[1]]];

   ax1,ay1,ax2,ay2,bx1,by1,bx2,by2

   var ax1 = line[0][0]
   var ay1 = line[0][1]
   var ax2 = line[1][0]
   var ay2 = line[1][1]

   for (i in segments) {
    var bx1 = segments[i][0][0]
    var by1 = segments[i][0][1]
    var bx2 = segments[i][1][0]
    var by2 = segments[i][1][1]
    var v1=(bx2-bx1)*(ay1-by1)-(by2-by1)*(ax1-bx1);
    var v2=(bx2-bx1)*(ay2-by1)-(by2-by1)*(ax2-bx1);
    var v3=(ax2-ax1)*(by1-ay1)-(ay2-ay1)*(bx1-ax1);
    var v4=(ax2-ax1)*(by2-ay1)-(ay2-ay1)*(bx2-ax1);
    var intersection = (v1*v2<0) && (v3*v4<0);
    if (intersection) {
      result = "intersected"
      break
    }
   }
   return result
}

/* GET nodes, ways and relations inside a triangle polygon */
router.post('/overpass', function(req, res) {
  console.log("Rotation: +++++++++++++++++++++++++++++++ " + req.body.mapRotation )
  var radius = "100"
  var latlon = ""
  var polygon = ""
  // 51.964112, 7.612124, 51.964059, 7.614774, 51.962793, 7.613277
  //var polygon = "51.964112 7.612124 51.964059 7.614774 51.962793 7.613277"
  if (req.body.polyCoords!="x") {
    var polygon = req.body.polyCoords
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
              }

              buildings.push({ id: result[element].id, geometry: building }) 
        }
      } else {
          for (element in result) {
            
            if (latlon!="") {
              var split = latlon.split(",")
              var lat = Number(split[0])
              var lon = Number(split[1])
            } else {
              var split = polygon.split(" ")
              var lat = Number(split[0])
              var lon = Number(split[1])
            }
            var point = turf.point([lon, lat]);

            var poly1status = true
            var poly2status = true
            var poly3status = true
            var poly4status = true
            var poly5status = true

            var add = true
            var nodes = result[element].geometry
            var building = ""
            //testId = result[element].id
            
            var bounds = result[element].bounds

            var poly1 = [[lon, lat], [Number(bounds.minlon), Number(bounds.minlat)]]           
            var poly2 = [[lon, lat], [Number(bounds.maxlon), Number(bounds.maxlat)]]                
            var poly3 = [[lon, lat], [Number(bounds.maxlon), Number(bounds.minlat)]]         
            var poly4 = [[lon, lat], [Number(bounds.minlon), Number(bounds.maxlat)]]
            var poly5 = [[lon, lat], [(Number(bounds.minlon)+Number(bounds.maxlon))/2, (Number(bounds.minlat)+Number(bounds.maxlat))/2]]
            for (x in result) {

              if (result[x].id != result[element].id) {

                var bbox = [
                  Number(result[x].bounds.minlon), 
                  Number(result[x].bounds.minlat), 
                  Number(result[x].bounds.maxlon), 
                  Number(result[x].bounds.maxlat)
                ];
                var poly = turf.bboxPolygon(bbox);

                if (!(turf.inside(point,poly))) {

                if (poly1status) {
                  if (intersectLineBBox(poly1,bbox)=="intersected") {

                    poly1status = false
                  }
                }
                if (poly2status) {
                  if (intersectLineBBox(poly2,bbox)=="intersected") {
       
                    poly2status = false
                  }
                }
                if (poly3status) {
                  if (intersectLineBBox(poly3,bbox)=="intersected") {

                    poly3status = false
                  }
                }
                if (poly4status) {
                  if (intersectLineBBox(poly4,bbox)=="intersected") {

                    poly4status = false
                  }

                }

                if (poly5status) {
                  if (intersectLineBBox(poly5,bbox)=="intersected") {

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
        icon: "point"
        // data: JSON.stringify(dec)
      });

/* WORKING
//save image in db
var image = new MyImage({ 
    name: req.file.originalname,
    path: 'C:/users/Zoe/Bachelor/public' + serverPath,
    coords: dec })

  image.save(function (err) {
    if (err) return console.error(err)
      else console.log("Saved in database")
  });
*/

      } 
    });
                     
  });



module.exports = router;
