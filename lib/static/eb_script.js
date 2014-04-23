var Emberbase = function (url) {
  this.socket = io.connect (url);
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
