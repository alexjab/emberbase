var gulp = require('gulp');

var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var paths = {
  scripts: ['lib/client/socket.io.js', 'lib/client/emberbase_client.js']
};

gulp.task('concat_uglify', function() {
  return gulp.src (paths.scripts)
  .pipe (uglify ())
  .pipe (concat ('emberbase.min.js'))
  .pipe (gulp.dest ('lib/client/dist'));
});

gulp.task ('default', ['concat_uglify']);
