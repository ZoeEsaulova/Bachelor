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
var tools = require('./tools');


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
    126807950,
    126807944,
    126810619
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
  var demoDur = 60
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
    126807950,
    126807944,
    126810619
    ]
    arrow = "arrow";
  } else if (req.body.test=="2") {
    console.log("Arrow: " + arrow)
     names = [
      126807950,
    126807944,
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
    directionFromUser: 360-tools.radToDegree(Number(req.body.mapRotation)),
    time: time,
    entry: req.params.entryId

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
      image.directionFromObject = Number(tools.findRotationFromTarget(targetLat, targetLon, originLat, originLon))
      console.log("Rot: " + Number(tools.findRotationFromTarget(targetLat, targetLon, originLat, originLon)))
      polygonCoords = tools.findPolygonFromObject(fov, req.body.lat, req.body.lon, req.body.imageSize, req.body.objectCoords, req.body.objectCoordsMap)[0]
      image.save()
  })
} else {
  MyTestImage.findOne({ _id: testImage._id}).exec(function(err, image) {
      polygonCoords = tools.findPolygonFromRotation(fov, Number(req.body.mapRotation), req.body.lat, req.body.lon, focalLength)[0]
      image.save()
  })
}
if (req.body.test=="1") {
  Entry.findOne({ _id: req.params.entryId }).exec(function(err, entry) {
    entry.test1.images.push(imageId)
    entry.save()
    console.log("JA! ------------ " + entry.test1Time)
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
    console.log("Entry test1 : " + entry.test1Result + " " + entry.test1Time)
  })
} 

  if (array.length==3 && req.body.test=="2") {
     

   Entry.findOne({ _id: req.params.entryId }).populate('testImage').exec(function(err, entry) {
    MyTestImage.find({ entry: req.params.entryId }).populate('entry').exec(function(err, images) {
        
      var test1Time = 0
      var test2Time = 0
      var test1Result = 0
      var test2Result = 0
          console.log("Images length: " + images.length)
      for (i=0;i<images.length;i++) {
        if (images[i].test=="1") {
          console.log("Images time " + images[i].time)
          test1Time = test1Time + images[i].time
          var diff = images[i].GPSImgDirection-images[i].directionFromUser
          if (diff>180) {
            diff = 360-diff
          }
          test1Result = test1Result + diff
        } else if (images[i].test=="2") {
          test2Time = test2Time + images[i].time
          var diff = images[i].GPSImgDirection-images[i].directionFromObject
          if (diff>180) {
            diff = 360-diff
          }
          test2Result = test2Result + diff
        }
      }
      entry.test2.easy = Number(req.body.easy),
      entry.test2.quickly = Number(req.body.quickly),
      entry.test2.comfortable = Number(req.body.comfortable),
      entry.test2.difficult = req.body.whatDifficult,
      entry.test2.like = req.body.whatLike,
      entry.test2.dislike = req.body.whatDislike
        entry.test1Time = Number(test1Time)
        entry.test2Time = test2Time
        entry.test1Result = Math.abs(test1Result/3)
        entry.test2Result = Math.abs(test2Result/3)
      entry.save()
      console.log("R E D I R E C T")
    res.redirect("/thanks")
  })
  })


    
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
  while (tools.randomInArray(x, nextArray)) {
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
    var url = "http://www.youtube.com/embed/pxbc_cLysWI?autoplay=0"
  } else if (req.params.test=="2") {
    //var url = "https://www.dropbox.com/s/ab72878kgaqs4f4/video1.mp4?dl=1"
    var url = "http://www.youtube.com/embed/X8S7mzNeGD0?autoplay=0"
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
  var r = 360-Number(tools.radToDegree(req.query.mapRotation))
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
    var result = tools.findPolygonFromObject(fov, originLat, originLon, req.query.imageSize, req.query.objectCoords, req.query.objectCoordsMap)
    console.log("ROTATIONNNNNNNNNNNNNNNN: " + result[1])
   } else if (req.query.modalCameraRotation=="f" && req.query.objectCoordsMap=="y") {
     console.log("Rotation ohne objekt")
    var result = tools.findPolygonFromRotation(fov, req.query.mapRotation, originLat, originLon, focalLength)
   } else if (req.query.modalCameraRotation=="f" && req.query.objectCoordsMap!="y") {
    console.log("Rotation AND objekt")
    var result = tools.findPolygonFromRotationAndObject(
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
  var r = 360-Number(tools.radToDegree(req.body.mapRotation))
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
    var result = tools.findPolygonFromObject(fov, originLat, originLon, req.body.imageSize, req.body.objectCoords, req.body.objectCoordsMap)
   } else if (req.body.modalCameraRotation=="f" && req.body.objectCoordsMap=="y") {
     console.log("Rotation ohne objekt")
    var result = tools.findPolygonFromRotation(fov, req.body.mapRotation, originLat, originLon, focalLength)
   } else if (req.body.modalCameraRotation=="f" && req.body.objectCoordsMap!="y" && req.body.multipleObjects!="Yes") {
    console.log("Rotation AND objekt")
    var result = tools.findPolygonFromRotationAndObject(
      fov, req.body.mapRotation, 
      originLat, originLon, req.body.imageSize, 
      req.body.objectCoords, req.body.objectCoordsMap)
   } else if (req.body.multipleObjects=="Yes" && req.body.modalCameraRotation=="f") {
      console.log("Rotation AND objekts ")
      //Save to Database
      console.log("Rotation: " + req.body.mapRotation + " " + tools.radToDegree(Number(req.body.mapRotation)))
      /* WORKING*/
      //save image in db
      var image = new MyImage({ 
          name: imageName,
          path: 'C:/users/Zoe/Bachelor/public/db/images/' + imageName,
          coords: [ Number(originLat), Number(originLon) ],
          direction: 360-tools.radToDegree(Number(req.body.mapRotation)),
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
          direction: Number(tools.findRotationFromTarget(targetLat, targetLon, originLat, originLon)),
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
      var buildings = tools.findViewableBuildings(polygon, body, latlon)

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

              /*bounds = tools.boundingBoxAroundPolyCoords([coords])
              var bounds = tools.boundingBoxAroundPolyCoords(nodes)
              //Display bounding boxen
              var building = ""
              for (i in bounds) {
                building =  building + bounds[i][0] + " " + bounds[i][1] + ":"
              }*/
              //building = bounds.minlat + " " + bounds.minlon + ":" + bounds.maxlat + " " + bounds.maxlon + ":"

        }
      } else {
        buildings = tools.findViewableBuildings(polygon, body, latlon)
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
