# SYNOPSIS
Append only binary data file store.

# FORMAT
Each block consists of a `sequence` (index), a `length` (length) and a
chunk of variable length of data. Because of this, only the sequence and
length need to be read, making it possible to "skip" through the file to
find a specific sequence. Both sequence and length are encoded as varints.

```
[SEQUENCE][LENGTH][DATA...]...
```

# API
## CONSTRUCTOR

The constructor accepts an options object. `{ filename: path }` specifies the
target file to read and write to.

```js
const { err, handle } = await new Skipfile()
```

## INSTANCE METHODS
Instance methods do not throw, they return an object which may contain `{ err }`.

### async append(value)
Appends a value to the file specified in the constructor.

```js
const { err, bytesWritten } = await handle.append(Buffer.from('Hello, world'))
```

### async next(bytes)
Iterate forward.

```js
while (true) {
  const { err, buffer, index } = await handle.next()

  if (err || !buffer) {
    break
  }

  console.log(buffer.toString())
}
```

### async seek(index)
TODO

```js
const { err, buffer } = await handle.seek(index)
```

### async close()
Closes the file descriptor opened by the constructor.

```javascript
await skip.close()
```

## INSTANCE MEMBERS
### size
Tracks the size of the file opened by the constructor.

