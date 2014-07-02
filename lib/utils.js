var setReference = exports.setReference = function (mainObject, route, path, data, callback) {
  if (path) {
    var merge = function (object, longKey, data) {
      if (longKey) {
        var key = longKey.shift ();
        if (!longKey.length) {
          if (callback) {
            callback (data, object[key]?object[key]:null);
          }
          object[key] = data;
        } else {
          if (!object[key] || typeof object[key] !== 'object') {
            object[key] = {};
          }
          merge (object[key], longKey, data);
        }
      } else {
        object = data;
      }
    };
    if (typeof mainObject[route] !== 'object') {
      mainObject[route] = {};
    }
    merge (mainObject[route], path?path.split ('/'):null, data);
  } else {
    if (callback) {
      callback (data, mainObject[route]?mainObject[route]:null);
    }
    mainObject[route] = data;
  }
};

var flattenObject = exports.flattenObject = function (route, path, object, callback) {
  var flatten = function (path, data) {
    if (typeof data === 'object') {
      Object.keys (data).forEach (function (key) {
        if (!path) {
          flatten (key, data[key]);
        } else {
          flatten (path+'/'+key, data[key]);
        }
      });
    } else {
      if (callback) {
        callback ({key: path, value: data});
      }
    }
  }
  flatten (route+(path?('/'+path):''), object);
};

var inflateObject = exports.inflateObject = function (store, flatObject, route) {
  Object.keys (flatObject[route]).forEach (function (key) {
    setReference (store, route, key, flatObject[route][key]);
  });
}

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
