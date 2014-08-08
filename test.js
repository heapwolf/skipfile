var Skipfile = require('./index.js');
var tap = require('tap');
var rimraf = require('rimraf');
var test = tap.test;

//
// a variable length string of random-enough data
//
function randomData() {
  return Math.random().toString(15).slice(Math.random()*1101)
}

test('append to a new log', function (t) {

 var rd = randomData();

  rimraf('./LOG', function(err) {

    var skip = Skipfile(function(err) {
      t.ok(!err, 'the file was successfully stated and opened');
      t.ok(skip.fd, 'a file descriptor was added to the instance');
      t.equal(skip.size, 0, 'the file could not be found, but was created and its initial size is 0');

      skip.append(rd, function(err, offset) {
        t.ok(!err, 'the file operation did not cause an error');
        t.end();
      });
    });
  });
});

test('append to an existing log', function (t) {

  var rd = randomData();

  var skip = Skipfile(function(err) {
    t.ok(!err, 'the file was successfully stated and opened');
    t.ok(skip.fd, 'a file descriptor was added to the instance');

    skip.append(rd, function(err, offset) {
      t.ok(!err, 'the file operation did not cause an error');
      rimraf('./LOG', function(err) {
        t.ok(!err, 'the log file was deleted');
        t.end();
      });
    });
  });
});

test('seek forward one record after a single append', function (t) {

  var rd = randomData();

  var skip = Skipfile(function(err) {
    t.ok(!err, 'the file was successfully stated and opened');

    skip.append(rd, function(err, offset) {
      t.ok(!err, 'the file operation did not cause an error');

      skip.forward(0, function(err, seq, offset, val) {
        t.equal(val.toString().length, rd.length, 'the data retreived from position 0 was the data appended at position 0');
        rimraf('./LOG', function(err) {
          t.ok(!err, 'the log file was deleted');
          t.end();
        });
      });
    });
  });
});

test('seek backward one record after a single append', function (t) {

  var rd = randomData();

  var skip = Skipfile(function(err) {
    t.ok(!err, 'the file was successfully stated and opened');

    skip.append(rd, function(err, offset) {
      t.ok(!err, 'the file operation did not cause an error');

      skip.backward(skip.size, function(err, seq, offset, val) {
        t.equal(val.toString().length, rd.length, 'the data retreived from position 0 was the data appended at position 0');
        rimraf('./LOG', function(err) {
          t.ok(!err, 'the log file was deleted');
          t.end();
        });
      });
    });
  });
});

test('seek forward all over multiple records until EOF', function (t) {

  var rd1 = randomData();
  var rd2 = randomData();
  var rd3 = randomData();

  var skip = Skipfile(function(err) {
    t.ok(!err, 'the file was successfully stated and opened');

    skip.append(rd1, function(err, offset) { t.ok(!err, 'the append operation did not cause an error');
    skip.append(rd2, function(err, offset) { t.ok(!err, 'the append operation did not cause an error');
    skip.append(rd3, function(err, offset) { t.ok(!err, 'the append operation did not cause an error');

      var sequences = [];

      -function forward(pos) {
        skip.forward(pos, function(err, seq, offset, val) {
          t.ok(!err, 'the forward seek operation did not cause an error');
          if (val) {
            sequences.push(seq);
            return forward(offset + 1);
          }
          t.equal(sequences.length, 3, 'three sequence numbers were found');
          t.equal(sequences[0], 1, 'the first sequence is 1');
          t.equal(sequences[1], 2, 'the first sequence is 2');
          t.equal(sequences[2], 3, 'the first sequence is 3');
          rimraf('./LOG', function(err) {
            t.ok(!err, 'the log file was deleted');
            t.end();
          });
        });
      }(0);

    }) }) });
  });
});

test('seek backward all over multiple records until EOF', function (t) {

  var rd1 = randomData();
  var rd2 = randomData();
  var rd3 = randomData();

  var skip = Skipfile(function(err) {
    t.ok(!err, 'the file was successfully stated and opened');

    skip.append(rd1, function(err, offset) { t.ok(!err, 'the append operation did not cause an error');
    skip.append(rd2, function(err, offset) { t.ok(!err, 'the append operation did not cause an error');
    skip.append(rd3, function(err, offset) { t.ok(!err, 'the append operation did not cause an error');

      var sequences = [];

      -function backward(pos) {
        skip.backward(pos, function(err, seq, offset, val) {
          t.ok(!err, 'the forward seek operation did not cause an error');
          if (val) {
            sequences.push(seq);
            return backward(offset);
          }
          t.equal(sequences.length, 3, 'three sequence numbers were found');
          t.equal(sequences[0], 3, 'the first sequence is 1');
          t.equal(sequences[1], 2, 'the first sequence is 2');
          t.equal(sequences[2], 1, 'the first sequence is 3');
          rimraf('./LOG', function(err) {
            t.ok(!err, 'the log file was deleted');
            t.end();
          });
        });
      }(skip.size);

    }) }) });
  });
});

