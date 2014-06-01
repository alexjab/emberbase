var http = require ('http');

var TheBulk = require ('thebulk');
var should = require ('should');

var Emberbase = require ('../bin/lib.js');
var thebulk = new TheBulk ();

describe ('bin/lib.js', function () {
  var server, emberbase, socket;
  before (function () {
    server = http.createServer ();
    emberbase = new Emberbase (server);
    socket = {};
  });

  describe ('new Emberbase ()', function () {
    it ('should create a new Emberbase server', function () {
      emberbase.should.have.property ('io');
      emberbase.should.have.property ('serverStatus');
      emberbase.should.have.property ('routes');
      emberbase.should.have.property ('_auth');
      emberbase.should.have.property ('_initData');
      emberbase.should.have.property ('_initSockets');
      emberbase.should.have.property ('addRoute');
      emberbase.should.have.property ('_onJoinRoute');
    });
  });

  describe ('addRoute', function () {
    it ('should add a route to the database', function () {
      var route = thebulk.string ();
      emberbase.addRoute (route);
      emberbase.routes.should.include (route);
    });
  });

  describe ('_onJoinRoute', function () {
    var counter = function () {
      var count = 0;
      return {
        incr: function (num) {return count+=num||1;},
        reset: function () {return count=0;}
      };
    } ();
    it ('should emit a error message when the route does not exist on the database', function (done) {
      var data = {route: thebulk.string ()+'456'};
      socket.emit = function (msg) {
        msg.should.equal ('UNKNOWN_ROUTE_ERR');
        done ();
      };
      emberbase._onJoinRoute (socket, data);
    });

    it ('should save the route to the socket, join the route room, and emit an ack (no error, no auth)', function (done) {
      counter.reset ();
      var route = thebulk.string ();
      emberbase.addRoute (route);
      socket.set = function (key, value, callback) {
        key.should.equal ('route');
        value.should.equal (route);
        (callback == undefined).should.be.false;
        counter.incr (3);
        callback.call (this);
      };
      socket.join = function (room) {
        room.should.equal (route);
        counter.incr (1);
      };
      socket.emit = function (msg) {
        msg.should.equal ('JOIN_ROUTE_ACK');
        counter.incr ().should.equal (5);
        done ();
      };
      var data = {route: route};
      emberbase._onJoinRoute (socket, data);
    });

    it ('should emit an error while trying to save the route to the socket (no auth)', function (done) {
      counter.reset ();
      var route = thebulk.string ();
      emberbase.addRoute (route);
      socket.set = function () {
        arguments[2].call (this, true);
      };
      socket.join = function (room) {};
      socket.emit = function (msg) {
        msg.should.equal ('JOIN_ROUTE_ERR');
        counter.incr ().should.equal (1);
        done ();
      };
      var data = {route: route};
      emberbase._onJoinRoute (socket, data);
    });
  });

  describe ('_onClientValue', function () {
    it ('should call the right methods, join the right rooms and emit the right values', function (done) {
      var route = thebulk.string ();
      var data = thebulk.obj ();
      emberbase.addRoute (route);
      emberbase._getAuth = function (_route, _socket, callback) {
        _route.should.equal (route);
        callback.call (this);
      };
      emberbase._getValue = function (route_, callback) {
        route_.should.equal (route);
        callback.call (this, data);
      };
      socket.get = function (key, callback) {
        key.should.equal ('route');
        callback (null, route);
      };
      socket.join = function (room) {
        room.should.equal (route+'/VALUE');
      };
      socket.emit = function (event, data_) {
        event.should.eql ('value_event');
        data_.should.eql (data);
        done ();
      };
      emberbase._onClientValue (socket);
    });
  });

  describe ('_onClientChildAdded', function () {
    it ('should call the right methods, join the right rooms and emit the right values', function (done) {
      var route = thebulk.string ();
      var data = thebulk.obj ();
      emberbase.addRoute (route);
      emberbase._getAuth = function (_route, _socket, callback) {
        _route.should.equal (route);
        callback.call (this);
      };
      emberbase._getChildren = function (route_, callback) {
        route_.should.equal (route);
        callback.call (this, data);
      };
      socket.get = function (key, callback) {
        key.should.equal ('route');
        callback (null, route);
      };
      socket.join = function (room) {
        room.should.equal (route+'/CHILD_ADDED');
      };
      socket.emit = function (event, data_) {
        event.should.eql ('child_added_event');
        data_.should.eql (data);
        done ();
      };
      emberbase._onClientChildAdded (socket);
    });
  });
});
