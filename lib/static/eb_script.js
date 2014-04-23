var Emberbase = function (url) {
  var host = url.split ('/').slice (0,3).join ('/');
  var path = url.split ('/').slice (3,4).join ('/');
  this.socket = io.connect (host+'/socket/'+path);
  return this;
};

Emberbase.prototype.set = function (data) {
  this.socket.emit ('set_event', data);
  return this;
};

Emberbase.prototype.push = function (data) {
  this.socket.emit ('push_event', data);
  return this;
};

Emberbase.prototype.on = function (event, cb) {
  if (event === 'value') {
    this.socket.on ('value_event', cb);
  }
  if (event === 'child_added') {
    this.socket.on ('child_added_event', cb);
  }
  return this;
}
