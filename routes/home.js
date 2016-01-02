var express = require('express');
var router = express.Router();
var MyImage = require('../models/image');
var Entry = require('../models/entry');
var multer = require('multer');
router.use(multer({ dest: './public/images', inMemory: true }).single('image'));

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
var turf = require('turf');
var wgs = require('WGS84IntersectUtil');
var gju = require('geojson-utils');
//var easyimg = require('easyimage');

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
/* proceed to the next image */
router.post('/next', function(req, res) {
  var test = ""
  var next = ""
  var names = []
  var array = req.body.nextImage.split(" ")
  var showBuilding = false
  var arrow = "no"
  if (array.length==3 && req.body.test=="test1") {
    test = "test2"
    array = []
  } else {
    test = req.body.test
    next = req.body.nextImage
  }

  if (test=="test1") {
    names = [
    126807950,
    126807938,
    126807944
    ]
    arrow = "arrow"
  } else if (test=="test2") {
     names = [
      125965583,
      126810608,
      126810619
    ]
    arrow = "point"
    showBuilding = true
  }
  var nextArray = []
  for (index in array) {
    nextArray.push(Number(array[index]))
  }
  var x = Math.floor((Math.random() * 3))
  while (randomInArray(x, nextArray)) {
    x = Math.floor((Math.random() * 3))
  }
  if (next!="") { 
    next = next + " " + x
  } else {
    next = x
  }
  // read exif
  var buf = fs.readFileSync('C:/users/Zoe/Bachelor/public/images/' + names[x] + ".jpg");      
  var parser = require('exif-parser').create(buf);
  var result = parser.parse();
  var dec = [ result.tags.GPSLatitude, result.tags.GPSLongitude ]

  // Find buildings in radius 200
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
      //get lat and lon from URL
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
        console.log("building: " + building)
      res.render('home_for_survey.ejs', { 
        imageSource: "http://static.panoramio.com/photos/large/" + names[x] + ".jpg",
        nextImage: next,
        properties: JSON.stringify(dec),
        coordsString: 'Home page',
        buildingCoords: JSON.stringify(buildings),
        showBuilding: showBuilding,
        arrow: arrow,
        test: test
      })
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
  result3 = result3.times(1.2)
  //create Vec2D objects and rotate them
  var v0 = Vec2D.ObjectVector(result3.x, result3.y).rotate(-fov/2)
  var v1 = Vec2D.ObjectVector(result3.x, result3.y).rotate(fov/2)
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
  var rotation = rad
  var alpha = 0
  var lon = 0
  var lat = 0
  var distance = 300
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

  var imageCoords = imageCoordsGeo.toCartesian()
  var targetLat = Number(imageCoords.x)+Number(lat)
  var targetLon = Number(imageCoords.y)+Number(lon)

  return defineVector(fov, targetLat, targetLon, imageCoords)

}

function findRotationFromTarget(targetLat, targetLon, imageCoords) {
  var targetLon = Number(targetLon)
  var targetLat = Number(targetLat)
  var ix = Number(imageCoords.x)
  var iy = Number(imageCoords.y)
  console.log("Target: " + targetLat + " " + targetLon) 
  console.log("Origin: " + ix + " " + iy) 
  var lat = targetLat-ix
  var lon = targetLon-iy
  var distance = Math.sqrt(Math.pow(lat,2)+Math.pow(lon,2))
  console.log("Distance: " + distance)
  if ((targetLat>=ix) && (targetLon<=iy)) {
    var rad1 = Math.acos(lat/distance)
    var rad2 = Math.asin(-lon/distance)
    var rad = 3.1415926536-((rad1+rad2)/2)
    return rad
  } else if ((targetLat<=ix) && (targetLon<=iy)) {
    var rad1 = Math.acos(-lat/distance)
    var rad2 = Math.asin(-lon/distance)
    var rad = ((rad1+rad2)/2)
    return rad
  } else if ((targetLat>=ix) && (targetLon>=iy)) {
    var rad1 = Math.acos(lat/distance)
    var rad2 = Math.asin(lon/distance)
    var rad = 3.1415926536+((rad1+rad2)/2) 
    return rad
  }  else if ((targetLat<=ix) && (targetLon>=iy)) {
    var rad1 = Math.acos(-lat/distance)
    var rad2 = Math.asin(lon/distance)
    var rad = 6.2831853072-((rad1+rad2)/2)
    return rad
  }

}

/* define polygon nodes from matched object */
function findPolygonFromObject(fov, lat, lon, imageSize, objectCoords, objectCoordsMap) {
  
  var parsed = JSON.parse(objectCoordsMap)
  var lat5 = parsed[0].y
  var lon5 = parsed[0].x

  var imageCoordsGeo = new LatLon(Number(lat), Number(lon), LatLon.datum.WGS84)
    // if object marked

  var radInPixel = fov/Number(imageSize)
  var splitOb = objectCoords.split(" ")
  var selectionCenter = ((Number(splitOb[2])-Number(splitOb[0]))/2)+Number(splitOb[0])
  // if object to the left of the center - positiv offset
  var offset = (Number(imageSize)/2)-selectionCenter
  var radOffset = offset*radInPixel

  // get req.query.objectCoordsMap

  var targetGeo0 = new LatLon(lat5, lon5, LatLon.datum.WGS84)
  var target0 = targetGeo0.toCartesian()
  console.log("SSSSSSSSSSSS: " + target0)
  var imageCoords = imageCoordsGeo.toCartesian()
  //var target0 = new Vector3d(targetLat0, targetLon0, imageCoords.z)

  //set new origin
  var result0 = target0.minus(imageCoords)
  console.log("Rad offset: " + radOffset)
  var preResult = Vec2D.ObjectVector(result0.x, result0.y).rotate(-1.5*radOffset)
  var targetLat = preResult.x + Number(imageCoords.x)
  var targetLon = preResult.y + Number(imageCoords.y)

  var rotation = findRotationFromTarget(targetLat, targetLon, imageCoords)
  console.log("FOUND Rotation: " + rotation)

  return defineVector(fov, targetLat, targetLon, imageCoords)

}

/* display polygon on map */
router.get('/showPolygon', function(req, res) {
  if (req.query.objectCoords!= undefined) {
    console.log("Get OBJECT")
    console.log("Center: " + req.query.objectCoordsMap)
    console.log("Selected buildings: " + req.query.selectedBuildings)
    var result = findPolygonFromObject(
      1.244672497




, req.query.lat, req.query.lon, req.query.imageSize, req.query.objectCoords, req.query.objectCoordsMap
    )
   } else {
    var result = findPolygonFromRotation(1.244672497





, req.query.mapRotation, req.query.lat, req.query.lon)
   }
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
  var names = [
    126807950,
    126807938,
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
    test: "test1"
  });
});


/* GET home page */
router.get('/', function(req, res) {

      res.render('home.ejs', { 
        coordsString: 'Home page', 
        properties: "[51.964045, 7.609542]",

        });
});

/* GET home page */
router.get('/test', function(req, res) {

      res.render('raphael.ejs');

});

function intersectLineBBox(line, bbox) {
   var result = false
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
      result = true
      break
    }
   }
   return result
}
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

function overpass(url,latlon,polygon) {

}
/* GET nodes, ways and relations inside a triangle polygon */
router.post('/overpass', function(req, res) {
  console.log("Rotation: " + req.body.mapRotation)
  if (req.body.arrow=="showArrow") {
    var arrow = "show"
  } else {
    var arrow = "do not show"
  }
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
    console.log("LatLon: " + latlon)
    var data = 'way(around:' + radius + ',' + latlon +  ')["building"];'
  }
  //var data = 'way(poly:"51.962034 7.626290 51.961175 7.627492")["building"];'
  var url = 'http://overpass-api.de/api/interpreter?data=[out:json];' + data + 'out geom;';
  /*var latlon = req.body.properties.slice(1, req.body.properties.length-1)
  var splitTest = latlon.split(",")
  var originTest = splitTest[0] + " " + splitTest[1] */
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
        console.log("HIER")
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
              var lat = Number(split[4])
              var lon = Number(split[5])
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
              console.log("I'm element " + result[element].id)
              for (node in nodes) {
                    var lat = nodes[node].lat
                    var lon = nodes[node].lon
                    building =  building + lat + " " + lon + ":"
                  }
                  buildings.push({ id: result[element].id, geometry: building }) 
            }  
          }         
      }


      //var point1 = turf.point(0,0);
      /*var testPolygon = originTest + " " + test
      var testData = 'way(poly:"' + testPolygon + '")["building"];'
      var testUrl = 'http://overpass-api.de/api/interpreter?data=[out:json];' + testData + 'out geom;';
      */
      /*
       request(
      { method: 'GET'
      , uri: testUrl
      , gzip: true
      }
    , function (error, response, body) {
       var result = JSON.parse(body).elements
      var buildings = []
      for (element in result) {
        var nodes = result[element].geometry
        var building = ""
        for (node in nodes) {
          var lat = nodes[node].lat
          var lon = nodes[node].lon
          building =  building + lat + " " + lon + ":"
        }
        buildings.push(building) 
      } */
      res.render("image.ejs", {
        //data: JSON.stringify(JSON.parse(body), null, 4)
        imagePath: req.body.imagePath,
        properties: req.body.properties,
        buildingCoords: JSON.stringify(buildings),
        building: true,
        radius: radius,
        bodyString: bodyString,
        arrow: arrow,
        rotation: req.body.mapRotation
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
        radius: "100"
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
