var benchmark = require('async-benchmark')

var Skipfile = require('./index')
var rimraf = require('rimraf')
var fs = require('fs')
const crypto = require('crypto')
const { promisify } = require('util')

const open = promisify(fs.open)

//
// a basic perf test to be sure that skipfile isn't
// too much slower than just a basic file append.
//

try {
  rimraf.sync('./LOG')
} catch (err) {
}

async function main () {
  // make a 5Gb file
  const ld = Buffer.from(crypto.prng(1024 * 1024).toString('hex'))

  let size = 0

  const { err, handle } = await new Skipfile({ filename: './LOG1' })

  if (err) throw err

  let fd = null

  try {
    fd = await open('./LOG2', 'a+')
  } catch (err) {
    throw err
  }

  benchmark('skipfile append',
    async function (done) {
      await handle.append(ld)
      done()
    },
    function (err, event) {
      if (err) throw err

      console.log(event.target.toString())

      benchmark('fs append',
        async function (done) {
          await handle.append(ld)
          done()
        },
        async function (err, event) {
          if (err) throw err
          console.log(event.target.toString())

          var b = Buffer.from(ld)
          size += ld.length
          fs.write(fd, b, 0, b.length, size, function () {})
        }
      )
    }
  )
}

main()
