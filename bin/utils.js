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

var inflateObject = exports.inflateObject = function (object, key, value) {
  key = key.replace ('.', '');
  var inflate = function (object, long_key, value) {
    var key = long_key[0];
    long_key.shift ();
    if (long_key.length === 0) {
      object[key] = value;
    } else {
      if (!object[key]) {
        object[key] = {};
      }
      inflate (object[key], long_key, value);
    }
  };
  inflate (object, key.split ('.'), value);
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
