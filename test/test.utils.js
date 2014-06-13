var should = require ('should');
var thebulk = require ('thebulk');
var bulk = new thebulk ();

var utils = require ('../lib/utils.js');

describe ('bin/utils.js', function () {
  describe ('flattenData', function () {
    it ('should flatten an object', function (done) {
      var id = bulk.int ();
      var first = bulk.string ();
      var last = bulk.string ();
      var object = {
        id: id,
        name: {
          first: first,
          last: last
        }
      };
      var actual = {
        route: {}
      };
      utils.flattenData (actual, 'route', null, object, function (type, key, value) {
        type.should.equal ('put');
        if (key === 'route/id') {
          value.should.equal (id);
        } else if (key === 'route/name/first') {
          value.should.equal (first);
        } else if (key === 'route/name/last') {
          value.should.equal (last);
        } else {
          throw Error ('The key does not match anything expected');
        }
      });
      var expected = {
        route: {
          id: id,
          'name/first': first,
          'name/last': last
        }
      };
      actual.should.eql (expected);
      done ();
    });
    it ('should flatten an object with an initial key', function (done) {
      var year = bulk.int ();
      var month = bulk.string ();
      var date = bulk.int ();
      var first = bulk.string ();
      var last = bulk.string ();
      var object = {
        birth: {
          year: year,
          month: month,
          date: date
        },
        firstname: first,
        lastname: last
      };
      var actual = {
        route: {}
      };
      var longKey = [bulk.string (), bulk.string (), bulk.string ()].join ('/');
      utils.flattenData (actual, 'route', longKey, object);
      var expected = {route: {}};
      expected.route[longKey+'/birth/year'] = year;
      expected.route[longKey+'/birth/date'] = date;
      expected.route[longKey+'/birth/month'] = month;
      expected.route[longKey+'/birth/year'] = year;
      expected.route[longKey+'/firstname'] = first;
      expected.route[longKey+'/lastname'] = last;

      actual.should.eql (expected);
      done ();
    });
  });

  describe ('inflateObject', function () {
    it ('should form a real object from a flattened one', function (done) {
      var expected = bulk.obj ();
      var flatObject = {
        route: {}
      };
      utils.flattenData (flatObject, 'route', null, expected);

      var actual = {};
      utils.inflateObject (actual, flatObject, 'route');
      actual.route.should.eql (expected);
      done ();
    });
  });

  describe ('generateId', function () {
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
