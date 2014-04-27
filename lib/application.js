var crypto = require ('crypto');

var express = require ('express');
var http = require ('http');
var socketio = require ('socket.io');

var levelup = require ('levelup');

var routes = require ('./routes.js');

var Emberbase = function () {
  this.app = new express ();
  this.app.get ('/emberbase.min.js', routes.min_js);

  this._create_store ();

  this.server = http.createServer (this.app);
  this.io = socketio.listen (this.server);
  this.io.set ('log level', 1);
  return this;
};

Emberbase.prototype.route = function (route) {
  var self = this;
  var _route = this.io
  .of ('/socket'+route)
  .on ('connection', function (socket) {
    self._emit_connection_data (route, socket, function () {
      socket.on ('set_event', function (data) {
        self._set_data (route, data, function (value) {
          _route.emit ('value_event', value);
        });
      });
      socket.on ('push_event', function (data) {
        self._push_data (route, data, function (value) {
          _route.emit ('child_added_event', value);
        });
      });
    });
  });
  return this;
};

Emberbase.prototype._create_store = function () {
  var LevelStore = function () {
    this.db = levelup ('./emberbase.db', {keyEncoding: 'json', valueEncoding: 'json'});
    this._data = {};
    var self = this;
    this.db.createKeyStream()
    .on('data', function (key) {
      if (key.type === 'set') {
        if (!self._data[key.route] || self._data[key.route].type === 'list') {
          self._data[key.route] = {type: 'set', data: null};
        }
        self._data[key.route].data = key.key;
      }
      if (key.type === 'list') {
        if (!self._data[key.route] || self._data[key.route].type === 'set') {
          self._data[key.route] = {type: 'list', data: []};
        }
        self._data[key.route].data.push (key.key);
      }
    })
  };
  LevelStore.prototype.set = function (route, id, val, cb) {
    var self = this;
    if (!this._data[route]) {
      this._data[route] = {type: 'set', data: null};
    } else if (this._data[route].type === 'list') {
      var ops = this._data[route].data.map (function (key) {
        return {type: 'del', key: key};
      });
      this.db.batch (ops, function (err) {
        if (err) console.log (err);
      })
      this._data[route] = {type: 'set', data: null};
    }
    this.db.del ({key: this._data[route].data, route: route, type: 'set'}, function (err) {
      self.db.put ({key: id, route: route, type: 'set'}, val, function (err) {
        self._data[route] = {type: 'set', data: id};
        cb ({key: id, val: val});
      });
    });
    return this;
  };
  LevelStore.prototype.push = function (route, id, val, cb) {
    if (!this._data[route]) {
      this._data[route] = {type: 'list', data: [id]};
    } else if (this._data[route].type === 'set') {
      this.db.del ({key: this._data[route].data, route: route, type: 'set'}, function (err) {
        if (err) console.log (err);
      });
      this._data[route] = {type: 'list', data: [id]};
    } else {
      this._data[route].data.push (id);
    };
    this.db.put ({key: id, route: route, type: 'list'}, val, function (err) {
      cb ({key: id, val: val});
    });
    return this;
  };
  LevelStore.prototype.init_route = function (route) {
    return this;
  };
  LevelStore.prototype.init_get = function (route, cb) {
    var self = this;
    if (this._data[route]) {
      if (this._data[route].type === 'set') {
        this.db.get ({key: this._data[route].data, route: route, type: 'set'}, function (err, value) {
          cb ('value', {key: self._data[route], val: value});
        });
      } else if (this._data[route].type === 'list') {
        this._data[route].data.forEach (function (key) {
          this.db.get ({key: key, route: route, type: 'list'}, function (err, value) {
            cb ('child_added', {key: key, val: value});
          });
        }, this);
      }
    }
    return this;
  };

  this.store = new LevelStore ();
  return this;
};

Emberbase.prototype._push_data = function (route, data, cb) {
  var self = this;
  crypto.randomBytes (8, function (err, buffer) {
    var shasum = crypto.createHash ('sha1');
    var id = shasum.update (buffer).digest ('hex').substr (0,8);
    self.store.push (route, id, data, cb);
  });
  return this;
};

Emberbase.prototype._set_data = function (route, data, cb) {
  var self = this;
  crypto.randomBytes (8, function (err, buffer) {
    var shasum = crypto.createHash ('sha1');
    var id = shasum.update (buffer).digest ('hex').substr (0,8);
    self.store.set (route, id, data, cb);
  });
  return this;
};

Emberbase.prototype._emit_connection_data = function (route, socket, cb) {
  this.store.init_get (route, function (event, data) {
    socket.emit (event+'_event', data);
  });
  //TODO: NOT BAD BUT NOT REALLY GOOD
  cb ();
};

Emberbase.prototype.listen = function (port) {
  this.server.listen (port);
  return this;
};

module.exports = Emberbase;
