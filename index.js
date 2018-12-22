const fs = require('fs')
const path = require('path')
const varint = require('varint')
const { promisify } = require('util')

const stat = promisify(fs.stat)
const open = promisify(fs.open)
const write = promisify(fs.write)
const read = promisify(fs.read)

module.exports = class Skipfile {
  constructor (opts = {}) {
    this.filename = opts.filename || path.join(process.cwd(), 'LOG')
  }

  async then (resolve) {
    let stats = null

    try {
      stats = await stat(this.filename)
    } catch (_) {}

    try {
      this.fd = await open(this.filename, 'a+')
    } catch (err) {
      return resolve({ err })
    }

    this.index = 0
    this.pos = 0
    this.size = (stats && stats.size) || 0

    resolve({ handle: this })
  }

  close () {
    const that = this

    return {
      then (resolve) {
        fs.close(that.fd, err => resolve({ err }))
      }
    }
  }

  async next ({ chunkSize = 8 } = {}) {
    if (this.pos + 1 === this.size) return {}

    let extrabytes = 0
    let buffer = null

    let index
    let len

    while (true) {
      const tmp = Buffer.alloc(chunkSize)
      tmp.fill(0x00)

      const args = [this.fd, tmp, 0, chunkSize, this.pos]
      let bytesRead = 0

      try {
        const r = await read(...args)
        bytesRead = r.bytesRead
      } catch (err) {
        return { err }
      }

      if (!buffer) {
        buffer = tmp
      } else {
        const l = buffer.length + tmp.length
        buffer = Buffer.concat([buffer, tmp], l)
      }

      if (typeof index === 'undefined') {
        index = varint.decode(tmp)

        if (index) {
          const bytes = varint.decode.bytes
          extrabytes += bytes
          this.pos += bytes
          continue
        }
      }

      if (typeof index !== 'undefined' && typeof len === 'undefined') {
        len = varint.decode(tmp)

        if (len) {
          const bytes = varint.decode.bytes
          chunkSize = len
          extrabytes += bytes
          this.pos += bytes
          continue
        }
      }

      this.pos += bytesRead

      const nodata = bytesRead === 0
      const full = index && len && (buffer.length >= len)

      if (nodata || full) {
        const slice = buffer.slice(extrabytes, len + extrabytes)

        return {
          index: index || 0,
          buffer: slice,
          length: len || 0
        }
      }
    }
  }

  async append (content) {
    const index = this.index += 1

    const indexBytes = varint.encodingLength(index)
    const lenBytes = varint.encodingLength(content.length)

    const marker = Buffer.alloc(indexBytes + lenBytes)
    varint.encode(index, marker, 0)
    varint.encode(content.length, marker, varint.encode.bytes)

    const len = marker.length + content.length
    content = Buffer.concat([marker, content], len)

    let r

    try {
      r = await write(this.fd, content, 0, content.length, this.size)
    } catch (err) {
      return { err }
    }

    this.size += r.bytesWritten

    return r
  }
}
