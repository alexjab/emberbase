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
    this.db = levelup ('./emberbase.db', {valueEncoding: 'json'});
  };
  LevelStore.prototype.set = function (route, key, val, cb) {
    this.db.put ('eb:'+route, {key: key, val: val}, function(err, value) {
      cb ({key: key, val: val});
    });
    return this;
  };
  LevelStore.prototype.push = function (route, key, val, cb) {
    var self = this;
    this.db.get ('eb:'+route, function (err, value) {
      if (!value || value.length === undefined) {
        self.db.put ('eb:'+route, [{key: key, val: val}], function (err, value) {
          cb ({key: key, val: val});
        });
      } else {
        value.push ({key: key, val: val});
        self.db.put ('eb:'+route, value, function (err, value) {
          cb ({key: key, val: val});
        });
      }
    });
    return this;
  };
  LevelStore.prototype.init_route = function (route) {
    return this;
  };
  LevelStore.prototype.get = function (route, cb) {
    this.db.get ('eb:'+route, function (err, value) {
      cb (value);
    });
    return this;
  };

  this._store = new LevelStore ();
  return this;
};

Emberbase.prototype._push_data = function (route, data, cb) {
  var self = this;
  crypto.randomBytes (8, function (err, buffer) {
    var shasum = crypto.createHash ('sha1');
    var id = shasum.update (buffer).digest ('hex').substr (0,8);
    self._store.push (route, id, data, cb);
  });
  return this;
};

Emberbase.prototype._set_data = function (route, data, cb) {
  var self = this;
  crypto.randomBytes (8, function (err, buffer) {
    var shasum = crypto.createHash ('sha1');
    var id = shasum.update (buffer).digest ('hex').substr (0,8);
    self._store.set (route, id, data, cb);
  });
  return this;
};

Emberbase.prototype._emit_connection_data = function (route, socket, cb) {
  this._store.get (route, function (data) {
    if (data) {
      if (data.length) {
        data.forEach (function (item) {
          socket.emit ('child_added_event', item);
        });
      } else {
        socket.emit ('value_event', data);
      }
    }
  });
  //TODO: NOT BAD BUT NOT REALLY GOOD
  cb ();
};

Emberbase.prototype.listen = function (port) {
  this.server.listen (port);
  return this;
};

module.exports = Emberbase;
