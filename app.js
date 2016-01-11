var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var port = process.env.PORT || 4444;

var mongoose = require('mongoose');
var configDB = require('./database.js');
var multer = require('multer');

// configuration ===============================================================
mongoose.connect(configDB.url);
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

//app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/public'));
app.use('/survey', express.static(__dirname + '/public'));
app.use('/survey/part1', express.static(__dirname + '/public'));
app.use('/survey/part2', express.static(__dirname + '/public'));

var routes = require('./routes/home');
//var survey = require('./routes/survey');

app.use('/', routes);
//app.use('/survey', survey);
app.listen(port);
console.log('The magic happens on port ' + port);

module.exports = app;
