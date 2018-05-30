process.env.NODE_ENV = 'test'

const after = require('after')
const assert = require('assert')
const errorHandler = require('..')
const http = require('http')
const request = require('supertest')
const util = require('util')

describe('errorHandler()', () => {
  it('should set nosniff header', (done) => {
    const server = createServer(new Error('boom!'))

    request(server)
      .get('/')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect(500, done)
  })

  describe('status code', () => {
    describe('when non-error status code', () => {
      it('should set the status code to 500', (done) => {
        const server = createServer({status: 200})

        request(server)
          .get('/')
          .expect(500, done)
      })
    })

  })

})

function createServer(error, options) {
  const _errorHandler = errorHandler(options)

  return http.createServer((req, res) => {
    _errorHandler(error, req, res, (err) => {
      res.statusCode = err ? 500 : 404
      res.end(err ? `Critical: ${err.stack}` : 'oops')
    })
  })
}
