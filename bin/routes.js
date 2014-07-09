var path = require ('path');

var clientMin = exports.clientMin = function (req, res) {
  res.sendfile (path.resolve (__dirname + '/../lib/client/dist/emberbase.min.js'));
};

var dashboard = exports.dashboard = function (req, res, emberbase) {
  var route = req.params.route;
  if (emberbase.routes.indexOf (route) !== -1) {
    res.render ('dashboard', {route: route, user: req.session.user});
  } else {
    res.send ('404');
  };
};

var home = exports.home = function (req, res, emberbase, conf) {
  handleSession (req, conf, function () {
    var clients = {};
    emberbase.routes.forEach (function (route) {
      clients[route] = emberbase.io.sockets.clients (route).length;
    });
    res.render ('home', {routes: emberbase.routes,
      clients:clients,
      sizes: emberbase.getDataSize (),
      serverStatus: emberbase.serverStatus,
      conf: conf
    });
  }, function () {
    res.redirect ('/signin?next='+req.session.lastPage);
  });
};

var signin = exports.signin = function (req, res, emberbase, conf) {
  var user = req.body.ebUsername;
  var pass = req.body.ebPassword;
  if (user && pass) {
    if (user === conf.username && pass === conf.password) {
      req.session.user = user;
      res.redirect (req.query.next||'/');
    } else {
      res.render ('signin', {user: user, pass: pass, error: true});
    }
  } else {
    res.render ('signin', {user: null, pass: null, error: false});
  }
};

var signout = exports.signout = function (req, res, emberbase, conf) {
  req.session.user = null;
  res.redirect ('signin');
};

var handleSession = function (req, conf, success, error) {
  req.session.lastPage = req.path;
  if (req.session.user && req.session.user === conf.username) {
    success.call (this);
  } else {
    if (error) error.call (this);
  }
};

var addRoute = exports.addRoute = function (req, res, emberbase, conf) {
  handleSession (req, conf, function () {
    var route = req.body.route;
    emberbase.addRoute (route);
    res.json ({success: {code: 200, msg: 'A route has been added'}});
  }, function () {
    res.json ({error: {code: 401, msg: 'User not authenticated'}});
  });
};
