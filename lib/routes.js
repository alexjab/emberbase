var client_min = module.exports.client_min = function (req, res) {
  res.sendfile (__dirname + '/client/dist/emberbase.min.js');
};

var interface = module.exports.interface = function (req, res) {
  var route = req.path.split ('/');
  route = route[route.length - 1];
  res.render ('interface', {route: route});
};
