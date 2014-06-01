var should = require ('should');

var utils = require ('../bin/utils.js');

describe ('bin/utils.js', function () {
  describe ('utils.flattenObject', function () {
    it ('should flatten an object', function (done) {
      var object = {
        id: 12345,
        name: {
          first: 'Alex',
          last: 'Terieur'
        }
      };
      var expected = {};
      utils.flattenObject (object, null, function (key, val) {
        expected[key] = val;
      });
      expected.should.have.property ('.id', 12345);
      expected.should.have.property ('.name.first', 'Alex');
      expected.should.have.property ('.name.last', 'Terieur');
      done ();
    });
    it ('should flatten an object with an initial key', function (done) {
      var object = {
        birth: {
          year: 1809,
          month: 'February',
          date: 12
        },
        firstname: 'Abraham',
        lastname: 'Lincoln'
      };
      var expected = {};
      utils.flattenObject (object, 'people', function (key, val) {
        expected[key] = val;
      });
      expected.should.have.property ('.people.birth.year', 1809);
      expected.should.have.property ('.people.birth.month', 'February');
      expected.should.have.property ('.people.birth.date', 12);
      expected.should.have.property ('.people.firstname', 'Abraham');
      expected.should.have.property ('.people.lastname', 'Lincoln');
      done ();
    });
    it ('should flatten an object with a context', function (done) {
      var object = {
        type: 'thingy',
        color: 'shiny',
        name: 'My precious'
      };
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

  describe ('utils.inflateObject', function () {
    it ('should form a real object from a flattened one', function (done) {
      var object = {
        '.from.the.dusty': 'mesa',
        '.her.looming.shadow': 'grows'
      };
      var actual = {};
      Object.keys (object).forEach (function (key) {
        utils.inflateObject (actual, key, object[key]);
      });
      actual.should.have.property ('from');
      actual.from.should.have.property ('the');
      actual.from.the.should.have.property ('dusty', 'mesa');
      actual.should.have.property ('her');
      actual.her.should.have.property ('looming');
      actual.her.looming.should.have.property ('shadow', 'grows');
      done ();
    });
  });

  describe ('utils.generateId', function () {
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
