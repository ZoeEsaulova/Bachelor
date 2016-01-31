var express = require('express');
var router = express.Router();
var tools = require('./tools');

/* Spacial Orientation Test*/
router.get('/', function(req, res) {
	console.log("test " + tools.radToDegree(1.2))
	console.log(tools.bar("test id"))
  res.render('survey_welcome.ejs');
});

module.exports = router;