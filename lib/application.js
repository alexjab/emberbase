var crypto = require ('crypto');
var http = require ('http');

var express = require ('express');
var levelup = require ('levelup');
var socketio = require ('socket.io');

var routes = require ('./routes.js');

var Emberbase = function () {
  this.app = new express ();
  this.app.use ('/static/css', express.static (__dirname + '/static/css'));
  this.app.use ('/static/fonts', express.static (__dirname + '/static/fonts'));
  this.app.use ('/static/img', express.static (__dirname + '/static/img'));
  this.app.use ('/static/js', express.static (__dirname + '/static/js'));
  this.app.set ('view engine', 'ejs');
  this.app.set ('views', __dirname + '/static/views');

  this.app.get ('/emberbase.min.js', routes.client_min);

  this._create_store ();

  this.server = http.createServer (this.app);
  this.io = socketio.listen (this.server);
  this.io.set ('log level', 1);
  return this;
};

Emberbase.prototype.route = function (route) {
  var self = this;
  var sockets = this.io
  .of ('/socket/'+route)
  .on ('connection', function (socket) {
    self._get_all_data (route, function (event, data) {
      socket.emit (event+'_event', data);
    });

    socket.on ('set_event', function (data) {
      self._set_data (route, data, function (value) {
        sockets.emit ('value_event', value);
      });
    });
    socket.on ('push_event', function (data) {
      self._push_data (route, data, function (value) {
        sockets.emit ('child_added_event', value);
      });
    });
  });
  return this;
};

Emberbase.prototype._create_store = function () {
  this._db = levelup ('./emberbase.db', {keyEncoding: 'json', valueEncoding: 'json'});
  this._data = {};
  var self = this;
  this._db.createKeyStream ()
  .on ('data', function (key) {
    if (!self._data[key.route]) {
      self._data[key.route] = {type: null, data: null};
    }
    if (key.type === 'set') {
      self._data[key.route].type = 'set';
      self._data[key.route].data = key.key;
    }
    if (key.type === 'list') {
      if (self._data[key.route].type !== 'list') {
        self._data[key.route].type = 'list';
        self._data[key.route].data = [key.key];
      } else {
        self._data[key.route].data.push (key.key);
        self._data[key.route].data.sort (function (a, b) {
          a = parseInt (new Buffer (a, 'base64').toString ('utf8'));
          b = parseInt (new Buffer (b, 'base64').toString ('utf8'));
          return a - b;
        });
      }
    }
  });
  return this;
};

Emberbase.prototype._push_data = function (route, data, cb) {
  var id = new Buffer ((new Date ().getTime ()).toString ()).toString ('base64').replace (/=/g, '');

  if (!this._data[route]) {
    this._data[route] = {type: 'list', data: [id]};
  } else if (this._data[route].type === 'set') {
    this._db.del ({key: this._data[route].data, route: route, type: 'set'}, function (err) {
      if (err) console.log (err);
    });
    this._data[route] = {type: 'list', data: [id]};
  } else {
    this._data[route].data.push (id);
  }

  this._db.put ({key: id, route: route, type: 'list'}, data, function (err) {
    cb ({key: id, val: data});
  });
  return this;
};

Emberbase.prototype._set_data = function (route, data, cb) {
  var id = new Buffer ((new Date ().getTime ()).toString ()).toString ('base64').replace (/=/g, '');

  if (!this._data[route]) {
    this._data[route] = {type: 'set', data: null};
  } else if (this._data[route].type === 'list') {
    var ops = this._data[route].data.map (function (key) {
      return {type: 'del', key: {key: key, route: route, type: 'list'}};
    });
    this._db.batch (ops, function (err) {
      if (err) console.log (err);
    })
    this._data[route] = {type: 'set', data: null};
  } else {
    this._db.del ({key: this._data[route].data, route: route, type: 'set'}, function (err) {
      if (err) console.log (err);
    });
  }

  this._data[route] = {type: 'set', data: id};
  this._db.put ({key: id, route: route, type: 'set'}, data, function (err) {
    cb ({key: id, val: data});
  });
  return this;
};

Emberbase.prototype._get_all_data = function (route, cb) {
  var self = this;
  if (this._data[route]) {
    if (this._data[route].type === 'set') {
      this._db.get ({key: this._data[route].data, route: route, type: 'set'}, function (err, value) {
        cb ('value', {key: self._data[route].data, val: value});
      });
    } else if (this._data[route].type === 'list') {
      this._data[route].data.forEach (function (key) {
        this._db.get ({key: key, route: route, type: 'list'}, function (err, value) {
          cb ('child_added', {key: key, val: value});
        });
      }, this);
    }
  }
  return this;
};

Emberbase.prototype.interface = function (route, auth) {
  this.app.get ('/'+route, routes.interface);
  return this;
};

Emberbase.prototype.listen = function (port) {
  this.server.listen (port);
  return this;
};

module.exports = Emberbase;
