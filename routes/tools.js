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

module.exports = {
  radToDegree: function (rad) {
    var degrees = Math.abs(rad)*(180/Math.PI)
        if (degrees > 360) { 
          degrees = degrees - (Math.floor(degrees / 360)*360) 
        } 
        if (rad<0) {
          degrees = 360 - degrees
        }
        return degrees
  },
	 /**
	 * Checks if array contains a certain number
	 * @param {Number} random
	 * @param {[Number]} array
	 * @return {boolean} is in array
	 */
	randomInArray: function(random, array) {

	  var result = false
	  for (index in array) {
	    if (random==array[index]) {
	      result = true
	      break
	    }  
	  }
	  return result
	},
	/**
	 * Finds target coordinates from rotation
	 * @param {Number} rotation
	 * @param {Number} tlat Latitude coordinate of the origin
	 * @param {Number} tlon Longitude coordinate of the origin
	 * @return {Number} distance Distance to the target
	 */
	targetFromRotation: function(rotation, tlat, tlon, distance) {
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
	},
	/**
	 * Finds polygon coordinates from rotation
	 * @param {Number} rotation
	 * @param {Number} tlat Latitude coordinate of the origin
	 * @param {Number} tlon Longitude coordinate of the origin
	 * @return {fov} fov Field of view
	 */
	findPolygonFromRotation: function(fov, rotation, tlat, tlon, focal) {
	  var distance = 16.0437156645*Number(focal) + 190.362376587
	  console.log("this.findPolygonFromRotation: " + fov + " " + rotation  + " " + tlat + " " + tlon + " " + focal)
	  var target = this.targetFromRotation(rotation, tlat, tlon, distance)
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
	  var newRotation = 360-this.radToDegree(Number(rotation))
	  return [ result1,  newRotation ]
	},
	/**
	 * Finds rotation from target coordinates
	 * @param {targetLat} tlat Latitude coordinate of the target
	 * @param {targetLon} tlon Longitude coordinate of the target
	 * @param {originLat} tlat Latitude coordinate of the origin
	 * @param {originLon} tlon Longitude coordinate of the origin
	 * @return {Number} distance Distance to the target
	 */
	findRotationFromTarget: function(targetLat, targetLon, originLat, originLon) {
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
	    return 360-this.radToDegree(rad) 
	  } else if ((targetLat<=ix) && (targetLon<=iy)) {
	    var rad1 = Math.acos(-lat/distance)
	    var rad2 = Math.asin(-lon/distance)
	    var rad = ((rad1+rad2)/2)+1.5707963268
	    return 360-this.radToDegree(rad) 
	  } else if ((targetLat>=ix) && (targetLon>=iy)) {
	    var rad1 = Math.acos(lat/distance)
	    var rad2 = Math.asin(lon/distance)
	    var rad = 3.1415926536+((rad1+rad2)/2)+1.5707963268
	    return 360-this.radToDegree(rad) 
	  }  else if ((targetLat<=ix) && (targetLon>=iy)) {
	    var rad1 = Math.acos(-lat/distance)
	    var rad2 = Math.asin(lon/distance)
	    var rad = 6.2831853072-((rad1+rad2)/2) + 1.5707963268
	    return 360-this.radToDegree(rad) 
	  }
	},
	targetFromObject: function(fov, lat, lon, imageSize, objectCoords, objectCoordsMap) {
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
	},
	distanceToObject: function(lat, lon, targetLat, targetLon) {
	  return Math.sqrt(Math.pow(targetLat-lat,2)+Math.pow(targetLon-lon,2))
	},
	/* define polygon nodes from matched object */
	findPolygonFromObject: function(fov, lat, lon, imageSize, objectCoords, objectCoordsMap) {
	 
	  var target = this.targetFromObject(fov, lat, lon, imageSize, objectCoords, objectCoordsMap) 
	  var targetLat = target[0]
	  var targetLon = target[1]
	  var distance = this.distanceToObject(Number(lat), Number(lon), targetLat, targetLon)
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
	  var rotation = this.findRotationFromTarget(targetLat, targetLon, lat, lon)
	  return [ result, rotation ]
	},
	findPolygonFromRotationAndObject: function(fov, rotation, lat, lon, imageSize, objectCoords, objectCoordsMap) {
	  var targetO = this.targetFromObject(fov, lat, lon, imageSize, objectCoords, objectCoordsMap) 
	  var targetLatO = targetO[0]
	  var targetLonO = targetO[1]
	  var distance = this.distanceToObject(Number(lat), Number(lon), targetLatO, targetLonO)
	  var factor = 2.83477579755-(0.00522655115197*distance)
	   if (factor<1.2) {
	    factor = 1.2
	   }
	  var targetR = this.targetFromRotation(rotation, lat, lon, distance)
	  var targetLatR = targetR[0]
	  var targetLonR = targetR[1]

	  var targetLat = (targetLatO + targetLatR)/2
	  var targetLon = (targetLonO + targetLonR)/2

	  var rotationO = this.findRotationFromTarget(targetLatO, targetLonO, lat, lon)
	  var rotationResult = (Number(rotationO)  + (360-this.radToDegree(Number(rotation))))/2

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
	},
	boundingBoxAroundPolyCoords: function(nodes) {
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
              var maximumLat = this.findMax(lats);
              var maximumLon = this.findMax(lons);
              var minimumLat = this.findMin(lats);
              var minimumLon = this.findMin(lons);
              var fromMaxLat = [maximumLat]
              var fromMinLat = [minimumLat]
              var fromMaxLon = []
              var fromMinLon = []

              for (i in coords) {
                if (coords[i][0]==maximumLat) {
                    fromMaxLat.push(coords[i][1])          
                } else if (coords[i][0]==minimumLat) {
                    fromMinLat.push(coords[i][1])                
                }
                if (coords[i][1]==maximumLon) {   
                    fromMaxLon.push(coords[i][0])
                    fromMaxLon.push(maximumLon)          
                } else if (coords[i][1]==minimumLon) {
                    fromMinLon.push(coords[i][0])
                    fromMinLon.push(minimumLon)
                }
              }
              return [ fromMinLon, fromMinLat, fromMaxLon, fromMaxLat ]
  },
  findMin: function( array ){
    return Math.min.apply( Math, array );
  },

  findMax: function( array ){
    return Math.max.apply( Math, array );
  },
  findViewableBuildings: function(polygon, body, latlon) {
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
      var bounds = this.boundingBoxAroundPolyCoords(nodes)
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
                var boundsX = this.boundingBoxAroundPolyCoords(result[x].geometry)

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
}