var flatten_object = exports.flatten_object = function (object, key) {
  var obj = {};
  var flatten = function (parents, node) {
    Object.keys (node).forEach (function (key) {
      var value = node[key];
      if (typeof value !== 'object') {
        obj[parents+'.'+key] = value;
      } else {
        flatten (parents+'.'+key, value);
      }
    });
  };
  flatten (key?'.'+key:'', object);
  return obj;
};

var inflate_object = exports.inflate_object = function (object, key, value) {
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
