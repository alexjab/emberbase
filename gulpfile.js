var gulp = require('gulp');

var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var paths = {
  scripts: ['bin/client/socket.io.js', 'bin/client/emberbase_client.js']
};

gulp.task('concat_uglify', function() {
  return gulp.src (paths.scripts)
  .pipe (uglify ())
  .pipe (concat ('emberbase.min.js'))
  .pipe (gulp.dest ('bin/client/dist'));
});

gulp.task ('default', ['concat_uglify']);
