var http = require ('http');

var TheBulk = require ('thebulk');
var should = require ('should');

var Emberbase = require ('../bin/emberbase.js');
var thebulk = new TheBulk ();

describe ('bin/emberbase.js', function () {
  var server, emberbase, socket;
  before (function () {
    server = http.createServer ();
    emberbase = new Emberbase ({server: server, database: './emberbase_test_data'});
    socket = {};
    emberbase._getAuth = function (route_, socket_, callback) {
      callback.call (this);
    };
    emberbase._getValue = function (route, callback) {
      callback.call (this, thebulk.obj ());
    };
    emberbase._getChildren = function (route, callback) {
      callback.call (this, thebulk.obj ());
    };
    emberbase._setData = function (route, data, callback) {
      callback.call (this, data);
    };
    emberbase._setData = function (route, data, callback) {
      callback.call (this, data, thebulk.obj ());
    };
  });

  describe ('new Emberbase ()', function () {
    it ('should create a new Emberbase server', function () {
      emberbase.should.have.property ('io');
      emberbase.should.have.property ('serverStatus');
      emberbase.should.have.property ('routes');
      emberbase.should.have.property ('_useDB');
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
    it ('should emit a error message when the route does not exist on the database', function (done) {
      var data = {route: thebulk.string ()+'456'};
      socket.emit = function (msg) {
        msg.should.equal ('UNKNOWN_ROUTE_ERR');
        done ();
      };
      emberbase._onJoinRoute (socket, data);
    });

    it ('should save the route to the socket, join the route room, and emit an ack (no error, no auth)', function (done) {
      var route = thebulk.string ();
      emberbase.addRoute (route);
      socket.set = function (key, value, callback) {
        key.should.equal ('route');
        value.should.equal (route);
        (callback == undefined).should.be.false;
        callback.call (this);
      };
      socket.join = function (room) {
        room.should.equal (route);
      };
      socket.emit = function (msg) {
        msg.should.equal ('JOIN_ROUTE_ACK');
        done ();
      };
      var data = {route: route};
      emberbase._onJoinRoute (socket, data);
    });

    it ('should emit an error while trying to save the route to the socket (no auth)', function (done) {
      var route = thebulk.string ();
      emberbase.addRoute (route);
      socket.set = function () {
        arguments[2].call (this, true);
      };
      socket.join = function (room) {};
      socket.emit = function (msg) {
        msg.should.equal ('JOIN_ROUTE_ERR');
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
      socket.get = function (key, callback) {
        key.should.equal ('route');
        callback (null, route);
      };
      socket.join = function (room) {
        room.should.equal (route+'/VALUE');
      };
      socket.emit = function (event, data_) {
        event.should.eql ('value_event');
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
      socket.get = function (key, callback) {
        key.should.equal ('route');
        callback (null, route);
      };
      socket.join = function (room) {
        room.should.equal (route+'/CHILD_ADDED');
      };
      socket.emit = function (event, data_) {
        event.should.eql ('child_added_event');
        done ();
      };
      emberbase._onClientChildAdded (socket);
    });
  });

  describe ('_onSetEvent', function () {
    it ('should call the right methods to set data', function (done) {
      var route = thebulk.string ();
      var data = thebulk.obj ();
      emberbase.io = {
        sockets: {
          in: function (route_) {
            route_.should.equal (route+'/VALUE');
            return {
              emit: function (event, value) {
                event.should.equal ('value_event');
                value.should.equal (data);
                done ();
              }
            }
          }
        }
      };
      emberbase.addRoute (route);
      socket.get = function (key, callback) {
        key.should.equal ('route');
        callback (null, route);
      };
      emberbase._onSetEvent (socket, data);
    });
  });

  describe ('_onPushEvent', function () {
    it ('should call the right methods to push data', function (done) {
      var route = thebulk.string ();
      var data = thebulk.obj ();
      emberbase.io = {
        sockets: {
          in: function (route_) {
            (route_ === route+'/VALUE' || route_ === route+'/CHILED_ADDED').should.be.true;
            return {
              emit: function (event, value) {
                (event === 'value_event' || event === 'child_added_event').should.be.true;
                if (event === 'child_added_event')
                  value.should.equal (data);
                done ();
              }
            }
          }
        }
      };
      emberbase.addRoute (route);
      socket.get = function (key, callback) {
        key.should.equal ('route');
        callback (null, route);
      };
      emberbase._onSetEvent (socket, data);
    });
  });

  describe ('_initSockets', function () {
    it ('should init the sockets to listen to the right events', function (done) {
      socket.on = function (event, callback) {
        (event === 'JOIN_ROUTE_MSG' ||
          event === 'CLIENT_VALUE' ||
          event === 'CLIENT_CHILD_ADDED' ||
          event === 'set_event' ||
          event === 'push_event').should.be.true;
      };
      socket.emit = function (value) {
        value.should.equal ('SERVER_READY_MSG');
      };
      emberbase.io = {
        on: function (event, callback) {
          event.should.equal ('connection');
          callback (socket);
        }
      };
      emberbase._initSockets ();
      emberbase.serverStatus = 'loading';
      socket.emit = function (value) {
        value.should.equal ('SERVER_NOT_READY_ERR');
      };
      emberbase._initSockets ();
      emberbase.serverStatus = 'ready';
      done ();
    });
  });

  describe ('_pushData', function () {
    it ('should push some data', function (done) {
      var emberbase = new Emberbase ();
      var commit = { data: thebulk.obj () };
      var route = thebulk.obj ();
      emberbase.addRoute (route);

      emberbase._pushData (route, commit, function (child, value) {
        child.should.have.property ('key');
        child.should.have.property ('val');
        value.should.have.property ('val');
        child.val.should.eql (commit.data);
        value.val[child.key].should.eql (commit.data);
        done ();
      });
    });
  });

  describe ('_setData', function () {
    it ('should set some data', function (done) {
      var emberbase = new Emberbase ();
      var commit = { data: thebulk.obj () };
      var route = thebulk.obj ();
      emberbase.addRoute (route);

      emberbase._setData (route, commit, function (value) {
        value.val.should.eql (commit.data);
        done ();
      });
    });
  });

  describe ('_getChildren', function () {
    it ('should get the children', function (done) {
      var emberbase = new Emberbase ();
      var route = thebulk.string ();
      var commit = { data: thebulk.obj () };
      emberbase.addRoute (route);
      emberbase._pushData (route, commit, function (child, value) {
        child.val.should.eql (commit.data);
        emberbase._getChildren (route, function (data) {
          value.val[data.key].should.eql (data.val);
        }, emberbase);
        done ();
      });
    });
  });

  describe ('_getValue', function () {
    it ('should get the value from the data', function (done) {
      var emberbase = new Emberbase ();
      var route = thebulk.string ();
      var commit = {data: thebulk.object ()};
      emberbase.addRoute (route);
      emberbase._setData (route, commit, function (value) {
        emberbase._getValue (route, function (data) {
          value.should.eql (data);
          value.should.have.property ('val', commit.data);
          value.val.should.eql (commit.data);
          done ();
        });
      });
    });
  });
});
