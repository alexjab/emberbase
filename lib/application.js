var crypto = require ('crypto');
var http = require ('http');

var express = require ('express');
var levelup = require ('levelup');
var socketio = require ('socket.io');

var routes = require ('./routes.js');
var utils = require ('./utils.js');

var Emberbase = function () {
  this.app = new express ();
  this.app.use ('/static/css', express.static (__dirname + '/static/css'));
  this.app.use ('/static/fonts', express.static (__dirname + '/static/fonts'));
  this.app.use ('/static/img', express.static (__dirname + '/static/img'));
  this.app.use ('/static/js', express.static (__dirname + '/static/js'));
  this.app.set ('view engine', 'ejs');
  this.app.set ('views', __dirname + '/static/views');

  this.app.get ('/emberbase.min.js', routes.client_min);

  this._create_store ();

  this.server = http.createServer (this.app);
  this.io = socketio.listen (this.server);
  this.io.set ('log level', 1);
  return this;
};

Emberbase.prototype.route = function (route) {
  var self = this;
  var sockets = this.io
  .of ('/socket/'+route)
  .on ('connection', function (socket) {
    self._get_all_data (route, function (event, data) {
      socket.emit (event+'_event', data);
    });

    socket.on ('set_event', function (data) {
      self._set_data (route, data, function (value) {
        sockets.emit ('value_event', value);
      });
    });
    socket.on ('push_event', function (data) {
      self._push_data (route, data, function (value, all_data) {
        sockets.emit ('child_added_event', value);
        sockets.emit ('value_event', all_data);
      });
    });
  });
  return this;
};

Emberbase.prototype._create_store = function () {
  this._db = levelup ('./emberbase.db', {keyEncoding: 'json', valueEncoding: 'json'});
  this._data = {};
  this.__data = {};
  var self = this;
  this._db.createReadStream ()
  .on ('data', function (data) {
    if (data.key.key !== '.') {
      if (!self._data[data.key.route]) {
        self._data[data.key.route] = {};
      }
      utils.inflate_object (self._data[data.key.route], data.key.key, data.value);
      if (!self.__data[data.key.route]) {
        self.__data[data.key.route] = {};
      }
      self.__data[data.key.route][data.key.key] = data.value;
    } else {
      self._data[data.key.route] = data.value;
    }
  });
  return this;
};

Emberbase.prototype._push_data = function (route, data, cb) {
  var id = new Buffer ((new Date ().getTime ()).toString ()).toString ('base64').replace (/=/g, '');

  if (typeof this._data[route] !== 'object') {
    this._data[route] = {};
  }
  this._data[route][id] = data;

  cb ({key: id, val: data}, {val: this._data[route]});

  if (!this.__data[route]) {
    this.__data[route] = {};
  }
  if (this.__data[route]['.']) {
    this._db.del ({route: route, key: '.'}, function (err) {
      if (err) console.log (err);
    });
  }
  if (typeof data === 'object') {
    data = utils.flatten_object (data, id);
  } else {
    var _data = {};
    _data[id] = data;
    data = _data;
  }
  Object.keys (data).forEach (function (key) {
    this.__data[route][key] = data[key];
  }, this);
  var ops = Object.keys (data).map (function (key) {
    return {type: 'put', key: {route: route, key: key}, value: data[key]};
  });
  this._db.batch (ops, function (err) {
    if (err) console.log (err);
  });

  return this;
};

Emberbase.prototype._set_data = function (route, data, cb) {
  if (this.__data[route]) {
    var ops = Object.keys (this.__data[route]).map (function (key) {
      return {type: 'del', key: {route: route, key: key}};
    });
    this._db.batch (ops, function (err) {
      if (err) console.log (err);
    });
  }
  cb ({val: data});
  this._data[route] = data;

  if (typeof data !== 'object') {
    data = {'.': data};
  } else {
    data = utils.flatten_object (data);
  }
  this.__data[route] = {};
  Object.keys (data).forEach (function (key) {
    this.__data[route][key] = data[key];
  }, this);
  var ops = Object.keys (data).map (function (key) {
    return {type: 'put', key: {route: route, key: key}, value: data[key]};
  });
  this._db.batch (ops, function (err) {
    if (err) console.log (err);
  });

  return this;
};

Emberbase.prototype._get_all_data = function (route, cb) {
  var self = this;
  if (this._data[route]) {
    if (typeof this._data[route] === 'object') {
      Object.keys (this._data[route]).forEach (function (key) {
        cb ('child_added', {key: key, val: this._data[route][key]});
      }, this);
    }
    cb ('value', {val: self._data[route]});
  }
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
