var Emberbase = function (url, username, password) {
  var host = url.split ('/').slice (0,3).join ('/');
  var route = url.split ('/').slice (3,4).join ('/');
  this._socket = io.connect (host);
  if (username && password) {
    this._socket.emit ('JOIN_ROUTE_MSG', {route: route, auth: {user: username, pass: password}});
  } else {
    this._socket.emit ('JOIN_ROUTE_MSG', {route: route});
  }
  this._routeReady = false;
  var self = this;
  this._socket.on ('SERVER_NOT_READY_ERR', function () {
    throw new Error ('The server is not ready to accept data');
  });
  this._socket.on ('ROUTE_ERR', function () {
    throw new Error ('The route '+route+' does not exist on the server');
  });
  this._socket.on ('AUTH_ACK', function () {
    console.log ('Client authenticated');
  });
  this._socket.on ('AUTH_ERR', function () {
    throw new Error ('Authentication error');
  });
  return this;
};

Emberbase.prototype.set = function (data) {
  this._socket.emit ('set_event', data);
  return this;
};

Emberbase.prototype.push = function (data) {
  this._socket.emit ('push_event', data);
  return this;
};

Emberbase.prototype.on = function (event, cb) {
  switch (event) {
    case ('value'):
      this._socket.emit ('CLIENT_VALUE');
      break;
    case ('child_added'):
      this._socket.emit ('CLIENT_CHILD_ADDED');
      break;
  };
  this._socket.on (event+'_event', cb);
  return this;
}
