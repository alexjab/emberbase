var http = require ('http');

var TheBulk = require ('thebulk');
var should = require ('should');

var Emberbase = require ('../bin/lib.js');
var thebulk = new TheBulk ();

describe ('bin/lib.js', function () {
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
    server = http.createServer ();
    var emberbase = new Emberbase ({server: server, database: './emberbase_test_data_1'});
    describe ('(string data)', function () {
      it ('should push data to the database (object data)', function (done) {
        var route = thebulk.string ();
        var key1 = thebulk.string (), key2 = thebulk.string (), key3 = thebulk.string ();
        var value1 = thebulk.string (), value2 = thebulk.string ();
        var data = {};
        data[key1] = value1;
        data[key2] = {};
        data[key2][key3] = value2;
        emberbase._dbWriteStream = {
          write: function (data) {
            data.key.route.should.equal (route);
            data.should.have.property ('key');
            data.should.have.property ('value');
            if (data.key.key.indexOf (key1) !== -1)
              data.value.should.equal (value1);
            if (data.key.key.indexOf (key2+'.'+key3) !== -1)
              data.value.should.equal (value2);
          }
        };
        emberbase._pushData (route, data, function (child, value) {
          child.val.should.equal (data);
          value.val.should.have.property (child.key);
          value.val[child.key].should.eql (child.val);
          done ();
        }, emberbase);
      });
    });

    describe ('(string data)', function () {
      it ('should push data to the database (string data)', function (done) {
        var data = thebulk.string ();
        var route = thebulk.string ();
        emberbase._dbWriteStream = {
          write: function (data_) {
            data_.key.route.should.equal (route);
            data_.value.should.equal (data);
          }
        };
        emberbase._pushData (route, data, function (child, value) {
          child.val.should.equal (data);
          value.val.should.have.property (child.key, child.val);
          done ();
        }, emberbase);
      });
    });
  });

  describe ('_setData', function () {
    server = http.createServer ();
    var emberbase = new Emberbase ({server: server, database: './emberbase_test_data_2'});
    describe ('(object data)', function () {
      it ('should set data to the database (object data)', function (done) {
        var route = thebulk.string ();
        var key1 = thebulk.string (), key2 = thebulk.string (), key3 = thebulk.string ();
        var value1 = thebulk.string (), value2 = thebulk.string ();
        var data = {};
        data[key1] = value1;
        data[key2] = {};
        data[key2][key3] = value2;
        emberbase._dbWriteStream = {
          write: function (data) {
            data.key.route.should.equal (route);
            data.should.have.property ('key');
            data.should.have.property ('value');
            if (data.key.key === '.'+key1)
              data.value.should.equal (value1);
            if (data.key.key === '.'+key2+'.'+key3)
              data.value.should.equal (value2);
          }
        };
        emberbase._setData (route, data, function (value) {
          value.val.should.equal (data);
          done ();
        }, emberbase);
      });
    });

    describe ('(string data)', function () {
      it ('should set data to the database (string data)', function (done) {
        var data = thebulk.string ();
        var route = thebulk.string ();
        emberbase._dbWriteStream = {
          write: function (data_) {
            data_.key.route.should.equal (route);
            data_.value.should.equal (data);
          }
        };
        emberbase._pushData (route, data, function (value) {
          value.val.should.equal (data);
          done ();
        }, emberbase);
      });
    });
  });

  describe ('_getChildren', function () {
    it ('should get the children', function (done) {
      server = http.createServer ();
      var emberbase = new Emberbase ({server: server, database: './emberbase_test_data_3'});
      var route = thebulk.string ();
      var data = thebulk.object ();
      emberbase._setData (route, data, function (value_) {
        value_.val.should.eql (data);
        emberbase._getChildren (route, function (data) {
          value_.val[data.key].should.eql (data.val);
        }, emberbase);
        done ();
      });
    });
  });

  describe ('_getValue', function () {
    it ('should get the value from the data', function (done) {
      server = http.createServer ();
      var emberbase = new Emberbase ({server: server, database: './emberbase_test_data_4'});
      var route = thebulk.string ();
      var data = thebulk.object ();
      emberbase.addRoute (route);
      emberbase._setData (route, data, function (value_) {
        emberbase._getValue (route, function (value) {
          value.should.eql (value_);
          value.should.have.property ('val', data);
          value.val.should.eql (data);
          done ();
        });
      });
    });
  });
});
