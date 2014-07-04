var Reference = function (socket, path) {
  this._socket = socket;
  this.path = path;

  return this;
};

Reference.prototype.set = function (data) {
  this._socket.emit ('set_event', {path: this.path, data: data});
  return this;
};

Reference.prototype.push = function (data) {
  this._socket.emit ('push_event', {path: this.path, data: data});
  return this;
};

Reference.prototype.on = function (event, callback) {

  if (event === 'value') {
    this._client_value = true;
    this._socket.emit ('CLIENT_VALUE');

    var getReference = function (path, data, callback) {
      var get = function (longKey, object) {
        var key = longKey.shift ();
        if (longKey.length) {
          get (longKey, object[key]);
        } else {
          if (object[key]) {
            callback (object[key]);
          }
        }
      };
      get (path.split ('/'), data);
    };

    this._socket.on ('value_event', function (data) {
      if (this.path === '') {
        callback (data);
      } else if (data.path !== this.path) {
        getReference (this.path, data.val, function (extractedData) {
          data.val = extractedData;
          callback (data);
        });
      } else {
        callback (data);
      }
    }.bind (this));
  } else if (event === 'child_added') {
    this._client_child_added = true;
    this._socket.emit ('CLIENT_CHILD_ADDED');

    this._socket.on ('child_added_event', function (data) {
      if (data.path === this.path) {
        callback (data);
      }
    }.bind (this));
  }
  return this;
}

Reference.prototype.child = function (path) {
  return new Reference (this._socket, path);
};

var Emberbase = function (url, username, password) {
  var host = url.split ('/').slice (0,3).join ('/');
  var route = url.split ('/').slice (3,4).join ('/');
  this._socket = io.connect (host);
  if (username && password) {
    this._socket.emit ('JOIN_ROUTE_MSG', {route: route, auth: {user: username, pass: password}});
  } else {
    this._socket.emit ('JOIN_ROUTE_MSG', {route: route});
  }
  this._client_value = false;
  this._client_child_added = false;
  this._socket.on ('reconnect', function () {
    if (username && password) {
      this._socket.emit ('JOIN_ROUTE_MSG', {route: route, auth: {user: username, pass: password}});
    } else {
      this._socket.emit ('JOIN_ROUTE_MSG', {route: route});
    }
    this._socket.on ('JOIN_ROUTE_ACK', function () {
      if (this._client_value)
        this._socket.emit ('CLIENT_VALUE');
      if (this._client_child_added)
        this._socket.emit ('CLIENT_CHILD_ADDED');
    }.bind (this));
  }.bind (this));
  this._routeReady = false;
  this._socket.on ('SERVER_NOT_READY_ERR', function () {
    throw new Error ('The server is not ready to accept data');
  });
  this._socket.on ('UNKNOWN_ROUTE_ERR', function () {
    throw new Error ('The route '+route+' does not exist on the server');
  });
  this._socket.on ('JOIN_ROUTE_ERR', function () {
    throw new Error ('An error happened while trying to join a route. If this is not the first time you are seeing this message, please reload the page.');
  });
  this._socket.on ('AUTH_ACK', function () {
    console.log ('Client authenticated');
  });
  this._socket.on ('AUTH_ERR', function () {
    throw new Error ('Authentication error');
  });

  var mainRef = new Reference (this._socket, '');

  return mainRef;
};

