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
  .of ('/socket'+route)
  .on ('connection', function (socket) {
    self._emit_connection_data (route, socket, function () {
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
  _Store.prototype.get = function (route, cb) {
    cb (this.data[route]);
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

Emberbase.prototype._emit_connection_data = function (route, socket, cb) {
  this._store.get (route, function (data) {
    socket.emit ('value_event', data);
    if (data.length) {
      data.forEach (function (item) {
        socket.emit ('child_added_event', item);
      });
    }
  });
  //TODO: NOT BAD BUT NOT REALLY GOOD
  cb ();
};

Emberbase.prototype.listen = function (port) {
  var server = http.createServer (this.app);
  this.io = socketio.listen (server, {log: false});
  server.listen (port);
  return this;
};

module.exports = Emberbase;
