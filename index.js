var fs = require('fs');
var varint = require('varint');

var Skipfile = module.exports = function(opts, cb) {

  if (!(this instanceof Skipfile)) {
    return new Skipfile(opts, cb);
  }

  if (typeof opts == 'function') {
    cb = opts;
    opts = {};
  }

  var that = this;
  this.filename = opts.filename || './LOG';

  fs.stat(that.filename, function(err, stat) {

    fs.open(that.filename, 'a+', function(err, fd) {
      if (err) return cb(err);

      that.fd = fd;
      that.size = stat && stat.size || 0;

      var pos = that.size || 0;

      if (!pos) return cb(null, that);

      that.backward(pos, function(err, seq, offset, val) {
        if (err) return cb(err);

        that.seq = seq;
        that.len = val.toString().length;
        cb(null, that);
      });
    });
  });
};

Skipfile.prototype.close = function(cb) {
  fs.close(this.fd, cb);
};

Skipfile.prototype.backward = function(pos, cb) {

  var that = this;

  var seq_buf = new Buffer(8);
  var len_buf = new Buffer(8);

  seq_buf.fill(0x00);
  len_buf.fill(0x00);

  var offset = 0;
  var chunk_size = 1;
  var termcount = 0;
  var extrabytes = 0;
  var reread;
  var end = pos;

  var seq;
  var len;
  var val;

  (function read(pos) {

    var tmp = new Buffer(chunk_size);
    tmp.fill(0x00);

    fs.read(that.fd, tmp, offset, chunk_size, pos,
      function(err, bytesRead, data) {
        if (err) return cb(err);

        if (tmp[0] == 0 && pos != 0) {
          termcount++;
        }

        //
        // if we have three null bits, up the chunk size
        // for a forward read of two max-size varints.
        //
        if (termcount == 3 && !reread) {
          chunk_size = end - pos - 1;
          reread = true;
          return read(pos + 1);
        }

        if (reread && !val) {
          seq = varint.decode(tmp);
          extrabytes += varint.decode.bytes
          len = varint.decode(tmp, varint.decode.bytes)
          extrabytes += varint.decode.bytes

          if (len) {
            val = true;
            chunk_size = len;
            return read(pos - len - 1);
          }
        }

        if (val) {
          var offset = pos + len;
          return cb(null, seq, offset > -1 ? offset : 0, tmp);
        }

        pos == 0 ? cb(null) : read(pos - 1);
      }
    );
  }(pos));
};

Skipfile.prototype.forward = function(pos, cb) {

  if (pos + 1 == this.size) return;
  
  var that = this;
  var offset = 0;
  var chunk_size = 8;
  var termcount = 0;

  var seq;
  var len;
  var val;

  (function read(pos) {

    var tmp = new Buffer(chunk_size);
    tmp.fill(0x00);

    fs.read(that.fd, tmp, offset, chunk_size, pos,
      function(err, bytesRead, data) {
        if (err) return cb(err);

        if (tmp[0] == 0 && termcount < 3) {
          if (++termcount == 2) {
            return cb(null, seq || 0, pos, val || 0);
          }
        }

        if (typeof seq == 'undefined') {
          seq = varint.decode(tmp);
          if (seq) {
            return read(pos + varint.decode.bytes);
          }
        }
        else if (typeof len == 'undefined') {
          len = varint.decode(tmp);
          if (len) {
            chunk_size = len;
            return read(pos + varint.decode.bytes);
          }
        }
        else if (!val) {
          val = new Buffer(len);
          tmp.copy(val, 0, 0, tmp.length);
          chunk_size = 1;
          return read(pos + bytesRead);
        }
        read(pos + bytesRead);
      }
    )
  }(pos));
};

Skipfile.prototype.append = function(content, cb) {

  var that = this;
  var seq = this.seq = (this.seq || 0) + 1;

  var seq_bytes = varint.encodingLength(seq);
  var len_bytes = varint.encodingLength(content.length);
  var nul_bytes = 2; // bit on the end, between content and terminating bits.

  var size = (seq_bytes * 2) + (len_bytes * 2) + content.length + nul_bytes;
  var buffer = new Buffer(size);
  var pos = 0;

  buffer.fill(0x00);

  varint.encode(seq, buffer, pos);
  pos = seq_bytes;

  varint.encode(content.length, buffer, pos);
  pos += len_bytes;

  content.copy(buffer, pos)
  pos += content.length + 1; // advance to leave null bit.

  varint.encode(seq, buffer, pos);
  pos += seq_bytes;

  varint.encode(content.length, buffer, pos);
  pos += len_bytes;

  fs.write(this.fd, buffer, 0, buffer.length, this.size, function(err, bytesWritten) {
    that.size += bytesWritten;
    cb(err);
  });
};

