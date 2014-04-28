var interface = module.exports.interface = function (req, res) {
  var route = req.path.split ('/');
  route = route[route.length - 1];
  res.render ('interface', {route: route});
};
