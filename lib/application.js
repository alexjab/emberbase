var http = require ('http');

var express = require ('express');
var levelup = require ('levelup');
var socketio = require ('socket.io');

var routes = require ('./routes.js');
var utils = require ('./utils.js');

var database = process.env.NODE_ENV==='test'?'./test_emberbase.db':'./emberbase.db';

var Emberbase = function () {
  this.app = new express ();
  this.app.use ('/static/css', express.static (__dirname + '/static/css'));
  this.app.use ('/static/fonts', express.static (__dirname + '/static/fonts'));
  this.app.use ('/static/img', express.static (__dirname + '/static/img'));
  this.app.use ('/static/js', express.static (__dirname + '/static/js'));
  this.app.set ('view engine', 'ejs');
  this.app.set ('views', __dirname + '/static/views');
  this.app.get ('/emberbase.min.js', routes.client_min);

  this.server = http.createServer (this.app);
  this.io = socketio.listen (this.server);
  this.io.set ('log level', 1);

  this._isServerReady = false;
  this.routes = [];
  this._initData ();
  this._initSockets ();

  return this;
};

Emberbase.prototype.addRoute = Emberbase.prototype.route = function (route) {
  if (this.routes.indexOf (route) === -1) {
    this.routes.push (route);
  }
  return this;
};
Emberbase.prototype._initSockets = function () {
  var self = this;
  this.io.on ('connection', function (socket) {
    socket.on ('JOIN_ROUTE_MSG', function (data) {
      if (self.routes.indexOf (data.route) === -1) {
        socket.emit ('WRNG_NS_ERR');
        socket.disconnect ();
      } else {
        socket.set ('route', data.route, function (err) {
          if (!err) socket.emit ('JOIN_ROUTE_ACK');
        });
      }
    });

    if (self._isServerReady) {
      socket.emit ('SRV_RDY_MSG');
      socket.on ('CLT_VAL_EVT_MSG', function () {
        socket.get ('route', function (err, route) {
          socket.join (route+'/VAL_EVT');
          self._getValue (route, function (data) {
            socket.emit ('value_event', data);
          });
        });
      });
      socket.on ('CLT_CHLD_ADD_EVT_MSG', function () {
        socket.get ('route', function (err, route) {
          socket.join (route+'/CHLD_ADD_EVT');
          self._getChildren (route, function (data) {
            socket.emit ('child_added_event', data);
          });
        });
      });

      socket.on ('set_event', function (data) {
        socket.get ('route', function (err, route) {
          self._setData (route, data, function (value) {
            this.io.sockets.in (route+'/VAL_EVT').emit ('value_event', value)
          }, self);
        });
      });
      socket.on ('push_event', function (data) {
        socket.get ('route', function (err, route) {
          self._pushData (route, data, function (child, value) {
            console.log (child, value, route);
            this.io.sockets.in (route+'/CHLD_ADD_EVT').emit ('child_added_event', child)
            this.io.sockets.in (route+'/VAL_EVT').emit ('value_event', value)
          }, self);
        });
      });
    } else {
      socket.emit ('SRV_NOT_RDY_ERR');
    }
  });
  return this;
};

Emberbase.prototype._initData = function () {
  this._db = levelup (database, {keyEncoding: 'json', valueEncoding: 'json'});
  this._dbWriteStream = this._db.createWriteStream ();
  this._dbWriteStream.on ('error', function (err) {
    console.log (err)
  });
  this._data = {};
  this.__data = {};
  var self = this;
  this._db.createReadStream ()
  .on ('data', function (data) {
    if (data.key.key !== '.') {
      if (!self._data[data.key.route]) {
        self._data[data.key.route] = {};
      }
      utils.inflateObject (self._data[data.key.route], data.key.key, data.value);
      if (!self.__data[data.key.route]) {
        self.__data[data.key.route] = {};
      }
      self.__data[data.key.route][data.key.key] = data.value;
    } else {
      self._data[data.key.route] = data.value;
    }
  })
  .on('end', function () {
    self._isServerReady = true;
  });
  return this;
};

Emberbase.prototype._pushData = function (route, data, callback, context) {
  var id = utils.generateId (new Date ().getTime ());

  if (typeof this._data[route] !== 'object') {
    this._data[route] = {};
  }
  this._data[route][id] = data;

  if (!this.__data[route]) {
    this.__data[route] = {};
  }
  if (this.__data[route]['.']) {
    delete this.__data[route]['.'];
    this._dbWriteStream.write ({type: 'del', key: {route: route, key: '.'}});
  }

  if (typeof data === 'object') {
    utils.flattenObject (data, id, function (key, val) {
      this.__data[route][key] = val;
      this._dbWriteStream.write ({key: {route: route, key: key}, value: val});
    }, this);
  } else {
    this.__data[route]['.'+id] = data;
    this._dbWriteStream.write ({key: {route: route, key: '.'+id}, value: data});
  }

  callback.call (context, {key: id, val: data}, {val: this._data[route]});

  return this;
};

Emberbase.prototype._setData = function (route, data, callback, context) {
  if (this.__data[route]) {
    Object.keys (this.__data[route]).forEach (function (key) {
      this._dbWriteStream.write ({type: 'del', key: {route: route, key: key}});
    }, this);
  }
  this._data[route] = data;

  this.__data[route] = {};
  if (typeof data !== 'object') {
    this.__data[route]['.'] = data;
    this._dbWriteStream.write ({key: {route: route, key: '.'}, value: data});
  } else {
    utils.flattenObject (data, null, function (key, val) {
      this.__data[route][key] = val;
      this._dbWriteStream.write ({key: {route: route, key: key}, value: val});
    }, this);
  }

  callback.call (context, {val: data});

  return this;
};

Emberbase.prototype._getChildren = function (route, callback, context) {
  if (this._data[route]) {
    if (typeof this._data[route] === 'object') {
      Object.keys (this._data[route]).forEach (function (key) {
        callback.call (context, {key: key, val: this._data[route][key]});
      }, this);
    }
  }
  return this;
};

Emberbase.prototype._getValue = function (route, callback) {
  callback ({val: this._data[route]});
  return this;
};

Emberbase.prototype.interface = function (route, auth) {
  this.app.get ('/'+route, routes.interface);
  return this;
};

Emberbase.prototype.listen = function (port) {
  this.server.listen (port);
  return this;
};

module.exports = Emberbase;
