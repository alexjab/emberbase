var crypto = require ('crypto');

var express = require ('express');
var http = require ('http');
var socketio = require ('socket.io');

var Emberbase = function () {
  return this;
};

Emberbase.prototype.route = function (route) {
  this._store.initRoute (route);
  var self = this;
  this.io
  .of (route)
  .on ('connection', function (socket) {
    socket.on ('set_data', function (data) {
      self._set_data (route, data);
    });
    socket.on ('push_data', function (data) {
      self._push_data (route, data);
    });
  });
  return this;
};

Emberbase.prototype.store = function () {
  var _Store = function () {
    this.data = {};
  };

  _Store.prototype.set = function (route, val) {
    this.data[route] = val;
  };

  _Store.prototype.push = function (route, key, val) {
    if (!this.data[route].length) {
      this.data[route] = [];
    }
    this.data[route].push ({key: key, val: val});
  };

  _Store.prototype.initRoute = function (route) {
    this.data[route] = {};
  };

  this._store = new _Store ();
  return this;
};

Emberbase.prototype._push_data = function (route, data) {
  var self = this;
  crypto.randomBytes (256, function (err, buffer) {
    var shasum = crypto.createHash ('sha1');
    var id = shasum.update (buffer).digest ('hex').substr (0,8);
    self._store.push (route, id, data);
    console.log(JSON.stringify(self._store.data, null, 4))
  });
  return this;
};

Emberbase.prototype._set_data = function (route, data) {
  this._store.set (route, data);
  console.log (this._store.data);
  return this;
};

Emberbase.prototype.listen = function (port) {
  var app = express ();
  var server = http.createServer (app);
  this.io = socketio.listen (server);
  server.listen (port);
  return this;
};

module.exports = Emberbase;
