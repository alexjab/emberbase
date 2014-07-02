var should = require ('should');
var thebulk = require ('thebulk');
var bulk = new thebulk ();

var utils = require ('../lib/utils.js');

describe ('bin/utils.js', function () {

  describe ('.setReference ()', function () {
    it ('should set some new data in place of the existing one', function (done) {
      var route = bulk.string ();
      var _data = {};
      _data[route] = {
        foo: {
          bar: {
            baz: 'data'
          }
        }
      };

      var data = {
        foo: {
          bar: 'baz'
        }
      };

      utils.setReference (_data, route, null, data, function (put, del) {
        put.should.equal (data);
        del.should.equal (_data[route]);
        done ();
      });
    });

    it ('should insert and merge some new data in the existing one', function (done) {
      var route = bulk.string ();
      var oldValue = bulk.string ();
      var _data = {};
      _data[route] = {
        foo: {
          bar: {
            baz: oldValue
          }
        }
      };

      var data = bulk.string ();

      utils.setReference (_data, route, 'foo/bar/baz', data, function (put, del) {
        put.should.equal (data);
        del.should.equal (oldValue);
        done ();
      });
    });
  });

  describe ('.flattenObject ()', function () {
    it ('should flatten an object without an initial path', function (done) {
      var route = bulk.string ();
      var object = {
        foo: {
          bar: '',
          baz: ''
        }
      };
      var bar = bulk.string ();
      var baz = bulk.string ();
      object.foo.bar = bar;
      object.foo.baz = baz;

      var count = 0;
      utils.flattenObject (route, null, object, function (op) {
        (op.key === route+'/foo/bar' || op.key === route+'/foo/baz').should.be.true;
        if (op.key === route+'/foo/bar')
          op.value.should.equal (bar);
        if (op.key === route+'/foo/baz')
          op.value.should.equal (baz);
        if (count)
          done ();
        count++;
      });
    });

    it ('should flatten an object with an initial path', function (done) {
      var route = bulk.string ();
      var object = {
        foo: {
          bar: '',
          baz: ''
        }
      };
      var bar = bulk.string ();
      var baz = bulk.string ();
      object.foo.bar = bar;
      object.foo.baz = baz;

      var path = [bulk.string (), bulk.string (), bulk.string ()].join ('/');

      var count = 0;
      utils.flattenObject (route, path, object, function (op) {
        (op.key === route+'/'+path+'/foo/bar' || op.key === route+'/'+path+'/foo/baz').should.be.true;
        if (op.key === route+'/'+path+'/foo/bar')
          op.value.should.equal (bar);
        if (op.key === route+'/'+path+'/foo/baz')
          op.value.should.equal (baz);
        if (count)
          done ();
        count++;
      });
    });
  });

  describe ('.generateId ()', function () {
    it ('should generate an id from a integer seed', function (done) {
      var seed = 1234567890;
      utils.generateId (seed).should.equal ('08_VAH');
      done ();
    });

    it ('should generate two ids and the ids should be in the same order as the seeds', function (done) {
      var seed1 = Math.ceil (Math.random ()*(64*64*64*64*64 - 64*64*64*64)) + 64*64*64*64;
      var seed2 = Math.ceil (Math.random ()*(64*64*64*64*64 - 64*64*64*64)) + 64*64*64*64;
      var tmp = seed1<seed2?seed1:seed2;
      seed2 = seed1<seed2?seed2:seed1;
      seed1 = tmp;
      seed1.should.be.below.seed2;
      var id1 = utils.generateId (seed1);
      var id2 = utils.generateId (seed2);
      id1.should.be.below.id2;
      done ();
    });

    it ('should generate and id from a timestamp and the generated id should always have the same length', function (done) {
      var seed = new Date ().getTime ();
      var id = utils.generateId (seed);
      id.length.should.equal (7);
      utils.generateId (64*64*64*64*64*64*64-1).length.should.equal (7);
      utils.generateId (64*64*64*64*64*64).length.should.equal (7);
      seed.should.be.below (64*64*64*64*64*64*64);
      seed.should.be.above (64*64*64*64*64*64);
      id.should.be.below (utils.generateId (64*64*64*64*64*64*64-1));
      id.should.be.above (utils.generateId (64*64*64*64*64*64));
      done ();
    });
  });
});
