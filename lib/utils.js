var setReference = function (object, route, longKey, value) {
  if (longKey === '/') {
    object[route] = value;
  } else {
    var set = function (object, longKey, value) {
      var key = longKey.shift ();
      if (longKey.length === 0) {
        object[key] = value;
      } else {
        if (typeof object[key] !== 'object') {
          object[key] = {};
        }
        set (object[key], longKey, value);
      }
    };
    if (typeof object[route] !== 'object') {
      object[route] = {};
    }
    set (object[route], longKey.split ('/'), value);
  }
};

var inflateObject = exports.inflateObject = function (store, flatObject, route) {
  Object.keys (flatObject[route]).forEach (function (key) {
    setReference (store, route, key, flatObject[route][key]);
  });
}

var flattenData = exports.flattenData = function (flatObject, route, path, data, iterator, callback) {
  var diffData = {};
  diffData[route] = {};
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
      if (flatObject[route]['/']) {
        delete flatObject[route]['/'];
        if (iterator) {
          iterator.call (null, 'del', route+'/');
        }
      } else {
        if (path) {
          // if a longer key is added, which equals a shorter key and its value,
          // the shorter key should be deleted
          var pathList = path.split ('/');
          var lastKey;
          while (lastKey = pathList.pop ()) {
            delete flatObject[route][pathList.join ('/')];
            iterator.call (null, 'del', route+'/'+pathList.join ('/'));
          }
        }

        // if a shorter key is a subkey of a longer key, the longer key should be deleted
        // e.g. if key foo/bar/baz exists and key foo/bar is added
        Object.keys (flatObject[route]).forEach (function (key) {
          if ((path && key.substr (0, path.length) === path)||!path) {
            delete flatObject[route][key];
            if (iterator) {
              iterator.call (null, 'del', route+'/'+key);
            }
          }
        });
      }

      flatObject[route][path||'/'] = data;
      diffData[route][path||'/'] = data;
      if (iterator) {
        iterator.call (null, 'put', route+'/'+path||'', data);
      }
    }
  };
  flatten (path, data);
  if (callback) {
    callback.call (null, diffData);
  }
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
