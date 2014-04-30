var gulp = require('gulp');

var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var paths = {
  scripts: ['lib/static/socket.io.js', 'lib/static/emberbase_client.js']
};

gulp.task('concat', function() {
  return gulp.src (paths.scripts)
  .pipe (concat ('emberbase.js'))
  .pipe (gulp.dest ('lib/static/js'));
});

gulp.task('concat_uglify', function() {
  return gulp.src (paths.scripts)
  .pipe (uglify ())
  .pipe (concat ('emberbase.min.js'))
  .pipe (gulp.dest ('lib/static/js'));
});

gulp.task ('default', ['concat', 'concat_uglify']);
