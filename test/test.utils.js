var should = require ('should');
var thebulk = require ('thebulk');
var bulk = new thebulk ();

var utils = require ('../bin/utils.js');

describe ('bin/utils.js', function () {
  describe ('flattenObject', function () {
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
      var expected = {};
      utils.flattenObject (object, null, function (key, val) {
        expected[key] = val;
      });
      expected.should.have.property ('.id', id);
      expected.should.have.property ('.name.first', first);
      expected.should.have.property ('.name.last', last);
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
      var expected = {};
      var initKey = bulk.string ();
      utils.flattenObject (object, initKey, function (key, val) {
        expected[key] = val;
      });
      expected.should.have.property ('.'+initKey+'.birth.year', year);
      expected.should.have.property ('.'+initKey+'.birth.month', month);
      expected.should.have.property ('.'+initKey+'.birth.date', date);
      expected.should.have.property ('.'+initKey+'.firstname', first);
      expected.should.have.property ('.'+initKey+'.lastname', last);
      done ();
    });
    it ('should flatten an object with a context', function (done) {
      var object = bulk.obj ();
      this._true = false;
      this._one = 0;
      this._defined = undefined;
      this._z = 'A';
      var self = {_true: true, _one: 1, _defined: 'abcd', _z: 'z'};
      utils.flattenObject (object, 'stuff', function (key, val) {
        this._true.should.be.true;
        this._one.should.eql (1);
        this._defined.should.eql ('abcd');
        this._z.should.eql ('z');
      }, self);
      done ();
    });
  });

  describe ('inflateObject', function () {
    it ('should form a real object from a flattened one', function (done) {
      var object = {
        '.from.the.dusty': 'mesa',
        '.her.looming.shadow': 'grows',
        '.hidden': {
          'in': {
            'the': 'branches',
            'of': 'the poison creosote'
          }
        }
      };
      var actual = utils.inflateObject (object);
      actual.should.have.property ('from');
      actual.from.should.have.property ('the');
      actual.from.the.should.have.property ('dusty', 'mesa');
      actual.should.have.property ('her');
      actual.her.should.have.property ('looming');
      actual.her.looming.should.have.property ('shadow', 'grows');
      actual.should.have.property ('hidden');
      actual.hidden.should.have.property ('in');
      actual.hidden.in.should.have.property ('the', 'branches');
      actual.hidden.in.should.have.property ('of', 'the poison creosote');
      done ();
    });
  });

  describe ('mergeObjects', function () {
    it ('should merge another object into a first one', function (done) {
      var foo = bulk.obj ();
      var bar = bulk.obj ();
      var baz = bulk.obj ();
      var object = {
        foo: foo,
        bar: bar
      };
      var other = {
        baz: baz
      };
      var actual = utils.mergeObjects (object, other);
      actual.should.have.property ('foo', foo);
      actual.should.have.property ('bar', bar);
      actual.should.have.property ('baz', baz);
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
