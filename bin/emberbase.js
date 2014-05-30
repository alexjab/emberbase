#!/usr/bin/env node

// Help
var program = require ('commander');

program
.version ('0.5.0')
.option('-p, --port <number>', 'A port number (default 8000)', parseInt)
.option('-u, --username <string>', 'A username for the admin interface (default admin)')
.option('-v, --password <string>', 'A password for the admin interface (default admin)')
.option('-s, --save', 'Save your settings to the configuration file (default is no)')
.parse (process.argv);

// Server
var http = require ('http');
var fs = require ('fs');

var express = require ('express');
var bodyParser = require ('body-parser');
var cookieParser = require ('cookie-parser');
var session = require ('cookie-session');

var Emberbase = require ('./lib.js');
var routes = require ('./routes.js');

var conf = {};

if (program.username || program.port || program.port) {
  conf = {
    username: program.username||'admin',
    password: program.password||'admin',
    port: program.port||8000
  };
  if (!program.save) {
    console.log ('Configuration from the command line. If you wish to save it, launch Emberbase with the flag --save');
  } else {
    fs.writeFileSync ('./emberbase_conf.json', JSON.stringify (conf, null, 2));
  }
} else {
  try {
    var conf = JSON.parse (fs.readFileSync ('./emberbase_conf.json'));
    conf = {
      username: conf.username||'admin',
      password: conf.password||'admin',
      port: conf.port||8000
    };
  } catch (e) {
    console.log ('No configuration file found, creating emberbase_conf.json');
    conf = {
      username: 'admin',
      password: 'admin',
      port: 8000
    };
  } finally {
    fs.writeFileSync ('./emberbase_conf.json', JSON.stringify (conf, null, 2));
    console.log ('Configuration loaded');
  }
}

var app = new express ();
var server = http.createServer (app);
var emberbase = new Emberbase (server);

app.use (bodyParser ());
app.use (cookieParser ());
app.use (session ({secret: '#E8=}n}^<:I3iFx:~.:FgoB#hXmc.KZ#F!zF$(PULD(-+.Xk2?0~.H_z-xn{!23x'}));
app.use ('/static/css', express.static (__dirname + '/static/css'));
app.use ('/static/fonts', express.static (__dirname + '/static/fonts'));
app.use ('/static/img', express.static (__dirname + '/static/img'));
app.use ('/static/js', express.static (__dirname + '/static/js'));
app.set ('view engine', 'ejs');
app.set ('views', __dirname + '/static/views');
app.get ('/emberbase.min.js', routes.clientMin);
app.get ('/', function (req, res) {
  routes.index (req, res, emberbase, conf);
});
app.get ('/signin', function (req, res) {
  routes.signin (req, res, emberbase, conf);
});
app.post ('/signin', function (req, res) {
  routes.signin (req, res, emberbase, conf);
});
app.get ('/signout', function (req, res) {
  routes.signout (req, res, emberbase, conf);
});
app.post ('/api/addRoute', function (req, res) {
  routes.addRoute (req, res, emberbase, conf);
});
app.get ('/:route', function (req, res) {
  routes.dashboard (req, res, emberbase, conf);
});

server.listen (conf.port, function () {
  console.log ('Server listening on port '+conf.port);
});
