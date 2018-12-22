const Skipfile = require('./index.js')
const test = require('tape')
const rimraf = require('rimraf')
const varint = require('varint')

//
// a variable length string of random-enough data
//
function randomData () {
  return Buffer.from('ABCDEF00'.repeat(Math.max(1, Math.random() * 1024)))
}

test('sanity', async t => {
  const index = 100
  const str = 'hello, world'

  let buffer = Buffer.from(str)

  const marker = Buffer.alloc(varint.encodingLength(index) + varint.encodingLength(buffer.length))
  varint.encode(index, marker, 0)
  varint.encode(buffer.length, marker, 1)

  buffer = Buffer.concat([marker, buffer], marker.length + buffer.length)

  {
    const index = varint.decode(buffer, 0)
    let markerlen = varint.decode.bytes

    const len = varint.decode(buffer, 1)
    markerlen += varint.decode.bytes

    t.equal(index, 100)
    t.equal(len, 12)
    const start = markerlen
    const end = len + markerlen
    const actual = buffer.slice(start, end).toString()
    t.equal(actual, str)
  }

  t.end()
})

test('append and move forward one block', async t => {
  try {
    rimraf.sync('./LOG')
  } catch (err) {
  }

  const rd = randomData()

  const { err, handle } = await new Skipfile()
  t.ok(!err, 'the file was successfully stated and opened')

  {
    const { err } = await handle.append(rd)
    t.ok(!err, 'the file operation did not cause an error')
  }

  {
    const { err, buffer, length } = await handle.next()
    t.ok(!err, 'the file operation did not cause an error')
    t.equal(length, rd.length)
    t.equal(rd.length, buffer.length)
    t.end()
  }
})

//
// This test demonstrates that any number of blocks of variable
// Size can be added and then traversed correctly.
//
test('append mutliple and move forward multiple', async t => {
  try {
    rimraf.sync('./LOG')
  } catch (err) {
  }

  let total = 0

  const items = Array(Math.max(16, Math.floor(Math.random() * 1024)))
    .fill(0x00)
    .map(n => {
      const r = randomData()
      total += r.length
      return r
    })

  const { err, handle } = await new Skipfile()
  t.ok(!err, 'the file was successfully stated and opened')

  {
    console.time('append')

    let i = 0

    while (true) {
      const item = items[i++]
      if (!item) break
      const { err } = await handle.append(item)
      t.ok(!err, 'the file operation did not cause an error')
    }
    console.timeEnd('append')
  }

  {
    console.time('scan')
    let i = 0

    while (true) {
      const item = items[i++]
      if (!item) break

      const { buffer, index, length } = await handle.next()
      t.ok(index > i - 1, `indexuence ${index}`)
      t.equal(length, item.length)
      t.equal(item.length, buffer.length)
    }

    console.log('')
    console.timeEnd('scan')
    console.log('done: %s items, %s total length', items.length, total)
    await handle.close()
  }

  t.end()
})
