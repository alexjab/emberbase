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
  this._auth = {};
  this._initData ();
  this._initSockets ();

  return this;
};

Emberbase.prototype.addRoute = function (route, auth) {
  if (this.routes.indexOf (route) === -1) {
    this.routes.push (route);
    if (auth) {
      this._auth[route] = {user: auth.user, pass: auth.pass};
    }
  }
  return this;
};

Emberbase.prototype._onJoinRoute = function (socket, data) {
  if (this.routes.indexOf (data.route) === -1) {
    socket.emit ('ROUTE_ERR');
  } else {
    socket.set ('route', data.route, function (err) {
      if (!err) socket.emit ('JOIN_ROUTE_ACK');
      else socket.emit ('ROUTE_ERR');
      if (data.auth) {
        var routeAuth = this._auth[data.route];
        if (!routeAuth) {
          socket.emit ('AUTH_ERR');
        } else {
          if (!(data.auth.user === routeAuth.user && data.auth.pass === routeAuth.pass)) {
            socket.emit ('AUTH_ERR');
          } else {
            socket.set ('auth', true, function (err) {
              if (!err) socket.emit ('AUTH_ACK');
              else socket.emit ('AUTH_ERR');
            });
          }
        }
      }
    }.bind (this));
  }
};

Emberbase.prototype._onClientValue = function (socket) {
  socket.get ('route', function (err, route) {
    this._getAuth (route, socket, function () {
      socket.join (route+'/VALUE');
      this._getValue (route, function (data) {
        socket.emit ('value_event', data);
      });
    }, this);
  }.bind (this));
};

Emberbase.prototype._onClientChildAdded = function (socket) {
  socket.get ('route', function (err, route) {
    this._getAuth (route, socket, function () {
      socket.join (route+'/CHILD_ADDED');
      this._getChildren (route, function (data) {
        socket.emit ('child_added_event', data);
      });
    }, this);
  }.bind (this));
};

Emberbase.prototype._onSetEvent = function (socket, data) {
  socket.get ('route', function (err, route) {
    this._getAuth (route, socket, function () {
      this._setData (route, data, function (value) {
        this.io.sockets.in (route+'/VALUE').emit ('value_event', value)
      }, this);
    });
  });
};

Emberbase.prototype._onPushEvent = function (socket, data) {
  socket.get ('route', function (err, route) {
    this._getAuth (route, socket, function () {
      this._pushData (route, data, function (child, value) {
        this.io.sockets.in (route+'/CHILD_ADDED').emit ('child_added_event', child)
        this.io.sockets.in (route+'/VALUE').emit ('value_event', value)
      }, this);
    }, this);
  }.bind (this));
}

Emberbase.prototype._initSockets = function () {
  var self = this;
  this.io.on ('connection', function (socket) {
    socket.on ('JOIN_ROUTE_MSG', function (data) {
      self._onJoinRoute.call (self, socket, data);
    });

    if (self._isServerReady) {
      socket.emit ('SERVER_READY_MSG');
      socket.on ('CLIENT_VALUE', function () {
        self._onClientValue.call (self, socket);
      });
      socket.on ('CLIENT_CHILD_ADDED', function () {
        self._onClientChildAdded.call (self, socket);
      });

      socket.on ('set_event', function (data) {
        self._onSetEvent.call (self, socket, data);
      });
      socket.on ('push_event', function (data) {
        self._onPushEvent.call (self, socket, data);
      });
    } else {
      socket.emit ('SERVER_NOT_READY_ERR');
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

Emberbase.prototype._getAuth = function (route, socket, callback, context) {
  var self = this;
  if (!this._auth[route]) {
    callback.call (this);
  } else {
    socket.get ('auth', function (err, auth) {
      if (self._auth[route] && auth) {
        callback.call (context||this);
      } else {
        socket.emit ('AUTH_ERR');
      }
    });
  }
};

Emberbase.prototype.interface = function (route) {
  this.app.get ('/'+route, routes.interface);
  return this;
};

Emberbase.prototype.listen = function (port) {
  this.server.listen (port);
  return this;
};

module.exports = Emberbase;
