var Emberbase = function (url) {
  var host = url.split ('/').slice (0,3).join ('/');
  var route = url.split ('/').slice (3,4).join ('/');
  this.socket = io.connect (host);
  this.socket.emit ('JOIN_ROUTE_MSG', {route: route});
  this.serverReady = false;
  this.socketReady = false;
  var self = this;
  this.socket.on ('SRV_NOT_RDY_ERR', function () {
    throw new Error ('The server is not ready to accept data');
  });
  this.socket.on ('SRV_RDY_MSG', function () {
    self.serverReady = true;
  });
  this.socket.on ('WRNG_NS_ERR', function () {
    throw new Error ('The route '+route+' does not exist on the server');
  });
  this.socket.on ('JOIN_ROUTE_ACK', function () {
    self.socketReady = true;
  });
  return this;
};

Emberbase.prototype.set = function (data) {
  if (!this.serverReady) throw new Error ('The server is not ready to accept data');
  if (!this.socketReady) throw new Error ('The route you specified does not exist on the server');
  this.socket.emit ('set_event', data);
  return this;
};

Emberbase.prototype.push = function (data) {
  if (!this.serverReady) throw new Error ('The server is not ready to accept data');
  if (!this.socketReady) throw new Error ('The route you specified does not exist on the server');
  this.socket.emit ('push_event', data);
  return this;
};

Emberbase.prototype.on = function (event, cb) {
  switch (event) {
    case ('value'):
      this.socket.emit ('CLT_VAL_EVT_MSG');
      break;
    case ('child_added'):
      this.socket.emit ('CLT_CHLD_ADD_EVT_MSG');
      break;
  };
  this.socket.on (event+'_event', cb);
  return this;
}
