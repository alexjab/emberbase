var flattenObject = exports.flattenObject = function (object, init_key, iterator, context) {
  var flatten = function (long_key, node) {
    Object.keys (node).forEach (function (key) {
      var value = node[key];
      if (typeof value !== 'object') {
        iterator.call (context, long_key+'.'+key, value);
      } else {
        flatten (long_key+'.'+key, value);
      }
    });
  };
  flatten (init_key?'.'+init_key:'', object);
};

var mergeObjects = exports.mergeObjects = function (host, guest) {
  var merge = function (host, guest) {
    Object.keys (guest).forEach (function (key) {
      var val = guest[key];
      if (typeof val !== 'object') {
        host[key] = val;
      } else {
        merge (host[key] = {}, val);
      }
    });
  }
  merge (host, guest);
  return host;
};

var inflateObject = exports.inflateObject = function (flatObject) {
  var inflate = function (object, longKey, value) {
    var key = longKey.shift ();
    if (longKey.length === 0) {
      if (typeof value !== 'object') {
        object[key] = value;
      } else {
        object[key] = mergeObjects ({}, value);
      }
    } else {
      if (!object[key])
        object[key] = {};
      inflate (object[key], longKey, value);
    }
  };

  var object = {};
  Object.keys (flatObject).forEach (function (key) {
    inflate (object, key.replace ('.', '').split ('.'), flatObject[key]);
  });
  return object;
};

var generateId = exports.generateId = function (seed) {
  var src = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  var id = '';

  do {
    var num = seed%64;
    seed = (seed - num)/64;
    id = src[num] + id;
  } while (seed > 0);
  // do not forget to clear your entire database on Wednesday, 15 May 2109 right after 07:35:11,103 AM GMT
  return id;
};
