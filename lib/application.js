var crypto = require ('crypto');

var express = require ('express');
var http = require ('http');
var socketio = require ('socket.io');

var routes = require ('./routes.js');

var Emberbase = function () {
  this.app = new express ();
  this.app.get ('/emberbase.min.js', routes.min_js);
  return this;
};

Emberbase.prototype.route = function (route) {
  this._store.init_route (route);
  var self = this;
  var _route = this.io
  .of (route)
  .on ('connection', function (socket) {
    socket.on ('set_event', function (data) {
      self._set_data (route, data, function (value, children) {
        _route.emit ('value_event', children);
        _route.emit ('child_added_event', value);
      });
    });
    socket.on ('push_event', function (data) {
      self._push_data (route, data, function (value, children) {
        _route.emit ('value_event', children);
        _route.emit ('child_added_event', value);
      });
    });
  });
  return this;
};

Emberbase.prototype.store = function () {
  var _Store = function () {
    this.data = {};
  };
  _Store.prototype.set = function (route, key, val, cb) {
    this.data[route] = {key: key, val: val};
    cb ({key: key, val: val});
  };
  _Store.prototype.push = function (route, key, val, cb) {
    if (!this.data[route].length) {
      this.data[route] = [];
    }
    this.data[route].push ({key: key, val: val});
    cb ({key: key, val: val}, this.data[route]);
  };
  _Store.prototype.init_route = function (route) {
    this.data[route] = {};
  };

  this._store = new _Store ();
  return this;
};

Emberbase.prototype._push_data = function (route, data, cb) {
  var self = this;
  crypto.randomBytes (256, function (err, buffer) {
    var shasum = crypto.createHash ('sha1');
    var id = shasum.update (buffer).digest ('hex').substr (0,8);
    self._store.push (route, id, data, cb);
  });
  return this;
};

Emberbase.prototype._set_data = function (route, data, cb) {
  var self = this;
  crypto.randomBytes (256, function (err, buffer) {
    var shasum = crypto.createHash ('sha1');
    var id = shasum.update (buffer).digest ('hex').substr (0,8);
    self._store.set (route, id, data, cb);
  });
  return this;
};

Emberbase.prototype.listen = function (port) {
  var server = http.createServer (this.app);
  this.io = socketio.listen (server);
  server.listen (port);
  return this;
};

module.exports = Emberbase;
