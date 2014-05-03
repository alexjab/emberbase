var Emberbase = function (url) {
  var host = url.split ('/').slice (0,3).join ('/');
  var path = url.split ('/').slice (3,4).join ('/');
  this.socket = io.connect (host+'/'+path);
  this._is_server_ready = false;
  var self = this;
  this.socket.on ('SRV_NOT_RDY_ERR', function () {
    throw new Error ('The server is not ready to accept data');
  });
  this.socket.on ('SRV_RDY_MSG', function () {
    self._is_server_ready = true;
  });
  return this;
};

Emberbase.prototype.set = function (data) {
  if (!this._is_server_ready) throw new Error ('The server is not ready to accept data');
  this.socket.emit ('set_event', data);
  return this;
};

Emberbase.prototype.push = function (data) {
  if (!this._is_server_ready) throw new Error ('The server is not ready to accept data');
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
