# SYNOPSIS
Append data, seek forward and seek backward inside a binary file.

# BUILD STATUS
[![Build Status](http://img.shields.io/travis/hij1nx/skipfile.svg?style=flat)](https://travis-ci.org/hij1nx/skipfile)

# API
## CONSTRUCTOR

Using `new Skipfile()` or `Skipfile()` will create a new 
instance. The constructor accepts an options object. 
`{ filename: path }` specifies the target file to read and 
write to.

## INSTANCE METHODS
### append(value, callback)
Appends a value to the file specified in the constructor.

```javascript
var buf = new Buffer(randomData())
var skip = Skipfile(function(err) {
  skip.append(buf, function(err, offset) {
  })
})
```

### forward(bytes, callback)
Seeks forward from `bytes`.

```javascript
var skip = Skipfile(function(err) {

  -function forward(pos) {
    skip.forward(pos, function(err, seq, len, offset, val) {
      if (val) forward(offset + 1)
    })
  }(0)
})
```

### backward(bytes, callback)
Seeks backward from `bytes`.

```javascript
var skip = Skipfile(function(err) {

  -function backward(pos) {
    skip.backward(pos, function(err, seq, len, offset, val) {
      if (val) backward(offset)
    })
  }(skip.size - 1)
})
```

### close(callback)
Closes the file descriptor opened by the constructor.

```javascript
skip.close(function(err) {
})
```

## INSTANCE MEMBERS
### size
Tracks the size of the file opened by the constructor.

