var min_js = module.exports.min_js = function (req, res) {
  res.sendfile (__dirname + '/static/emberbase.min.js');
}
