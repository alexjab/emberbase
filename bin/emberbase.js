var levelup = require ('levelup');
var socketio = require ('socket.io');

var utils = require ('./utils.js');

var Emberbase = function (config) {
  config = config||{};
  this.io = null;
  if (config.server) {
    this.io = socketio.listen (config.server);
    this.io.set ('log level', 1);
  }

  this.serverStatus = 'loading';
  this.routes = [];
  this._auth = {};
  this._useDB = false;

  this._initData (config.database);
  this._initSockets ();

  return this;
};

Emberbase.prototype.addRoute = function (route, auth) {
  if (this.routes.indexOf (route) === -1) {
    this.routes.push (route);
    if (!(route in this._data)) {
      this._data[route] = {};
      this.__data[route] = {};
    }
    if (auth) {
      this._auth[route] = {user: auth.user, pass: auth.pass};
    }
  }
  return this;
};

Emberbase.prototype._onJoinRoute = function (socket, data) {
  if (this.routes.indexOf (data.route) === -1) {
    socket.emit ('UNKNOWN_ROUTE_ERR');
  } else {
    socket.set ('route', data.route, function (err) {
      socket.join (data.route);
      if (!err) socket.emit ('JOIN_ROUTE_ACK');
      else socket.emit ('JOIN_ROUTE_ERR');
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
    if (route) {
      this._getAuth (route, socket, function () {
        this._setData (route, data, function (value) {
          this.io.sockets.in (route+'/VALUE').emit ('value_event', value)
        }, this);
      });
    } else {
      socket.emit ('JOIN_ROUTE_ERR');
    }
  }.bind (this));
};

Emberbase.prototype._onPushEvent = function (socket, data) {
  socket.get ('route', function (err, route) {
    if (route) {
      this._getAuth (route, socket, function () {
        this._pushData (route, data, function (child, value) {
          this.io.sockets.in (route+'/CHILD_ADDED').emit ('child_added_event', child)
          this.io.sockets.in (route+'/VALUE').emit ('value_event', value)
        }, this);
      }, this);
    } else {
      socket.emit ('JOIN_ROUTE_ERR');
    }
  }.bind (this));
}

Emberbase.prototype._initSockets = function () {
  if (this.io) {
    this.io.on ('connection', function (socket) {
      socket.on ('JOIN_ROUTE_MSG', function (data) {
        this._onJoinRoute.call (this, socket, data);
      }.bind (this));

      if (this.serverStatus === 'ready') {
        socket.emit ('SERVER_READY_MSG');
        socket.on ('CLIENT_VALUE', function () {
          this._onClientValue.call (this, socket);
        }.bind (this));
        socket.on ('CLIENT_CHILD_ADDED', function () {
          this._onClientChildAdded.call (this, socket);
        }.bind (this));

        socket.on ('set_event', function (data) {
          this._onSetEvent.call (this, socket, data);
        }.bind (this));
        socket.on ('push_event', function (data) {
          this._onPushEvent.call (this, socket, data);
        }.bind (this));
      } else {
        socket.emit ('SERVER_NOT_READY_ERR');
      }
    }.bind (this));
  }
  return this;
};

Emberbase.prototype._initData = function (database) {
  this._data = {};
  this.__data = {};
  if (database) {
    this._useDB = true;
    var db = levelup (database, {keyEncoding: 'json', valueEncoding: 'json'});

    this._dbWriteStream = db.createWriteStream ();
    this._dbWriteStream.on ('error', function (err) {
      console.log (err)
      this.serverStatus = 'error';
    });

    db.createReadStream ()
    .on ('data', function (data) {
      var key = data.key.split ('/');
      var route = key.shift ();
      key = key.join ('/');
      if (!this.__data[route]) {
        this.__data[route] = {};
      }
      if (!this._data[route]) {
        this._data[route] = {};
      }
      if (this.routes.indexOf (route) === -1) {
        this.routes.push (route);
      }
      this.__data[route][key] = data.value;
    }.bind (this))
    .on ('end', function () {
      Object.keys (this.__data).forEach (function (route) {
        utils.inflateObject (this._data, this.__data, route);
      }.bind (this));
      console.log ('Data loaded from the database');
      this.serverStatus = 'ready';
    }.bind (this))
    .on ('error', function (err) {
      console.log (err)
      this.serverStatus = 'error';
    });
  }
  return this;
};

Emberbase.prototype._pushData = function (route, commit, callback, context) {
  var data = commit.data;
  var path = commit.path;
  var id = utils.generateId (new Date ().getTime ());

  utils.flattenData (this.__data, route, path?(path+'/'):''+id, data, function (type, key, value) {
    if (this._useDB) {
      if (type === 'del') {
        this._dbWriteStream.write ({type: 'del', key: key});
      } else {
        this._dbWriteStream.write ({key: key, value: value});
      }
    }
  }.bind (this));
  utils.inflateObject (this._data, this.__data, route);

  callback.call (context, {key: id, val: data}, {val: this._data[route]});

  return this;
};

Emberbase.prototype._setData = function (route, commit, callback, context) {
  var data = commit.data;
  var path = commit.path;

  utils.flattenData (this.__data, route, path, data, function (type, key, value) {
    if (this._useDB) {
      if (type === 'del') {
        this._dbWriteStream.write ({type: 'del', key: key});
      } else {
        this._dbWriteStream.write ({key: key, value: value});
      }
    }
  }.bind (this));
  utils.inflateObject (this._data, this.__data, route);

  callback.call (context, {val: this._data[route]});
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
  if (!this._auth[route]) {
    callback.call (this);
  } else {
    socket.get ('auth', function (err, auth) {
      if (this._auth[route] && auth) {
        callback.call (context||this);
      } else {
        socket.emit ('AUTH_ERR');
      }
    }.bind (this));
  }
};

Emberbase.prototype.getDataSize = function () {
  var sizes = {};
  var data = this.__data;
  var routes = this.routes;
  routes.forEach (function (route) {
    sizes[route] = 0;
    if (route in data) {
      Object.keys (data[route]).forEach (function (key) {
        var size = JSON.stringify ({route: route, key: key}).length + data[route][key].length;
        sizes[route] += size;
      });
    }
  });
  return sizes;
};

module.exports = Emberbase;
