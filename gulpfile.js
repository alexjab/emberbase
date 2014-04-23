var gulp = require('gulp');

var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var paths = {
  scripts: ['lib/static/socket.io.js', 'lib/static/eb_script.js']
};

gulp.task('concat', function() {
  return gulp.src (paths.scripts)
  .pipe (concat ('emberbase.js'))
  .pipe (gulp.dest ('lib/static'));
});

gulp.task('concat_uglify', function() {
  return gulp.src (paths.scripts)
  .pipe (uglify ())
  .pipe (concat ('emberbase.min.js'))
  .pipe (gulp.dest ('lib/static'));
});

gulp.task ('default', ['concat', 'concat_uglify']);
