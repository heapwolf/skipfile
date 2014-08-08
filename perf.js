var benchmark = require('async-benchmark');

var Skipfile = require('./index');
var rimraf = require('rimraf');
var fs = require('fs');

//
// a basic perf test to be sure that skipfile isn't 
// too much slower than just a basic file append.
//

function largeRandomData() {
  var r = Array
    .apply(null, new Array(952))
    .map(Math.random)
    .map(function(v) { return v.toString(15) })
    .join('')
  return r;
}

rimraf('./LOG1', function(err) {

  var ld = largeRandomData();
  var size = 0;
  var skip = Skipfile({ filename: './LOG1' }, function(err) {

    var file = fs.open('./LOG2', 'r+', function(err, fd) {

      benchmark('skipfile append', 
        function(done) {
          skip.append(ld, done);
        }, 
        function(err, event) {
          console.log(event.target.toString());

          benchmark('fs append', 
            function(done) {
              skip.append(ld, done);
            }, 
            function(err, event) {
              console.log(event.target.toString());

              var b = new Buffer(ld);
              size += ld.length;
              fs.write(fd, b, 0, b.length, size, function() {});
            }
          );
        }
      );
    });
  });
});

