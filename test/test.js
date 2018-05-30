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

    describe('when err.status exists', () => {
      it('should set res.statusCode', (done) => {
        const server = createServer({status: 404})

        request(server)
          .get('/')
          .expect(404, done)
      })
    })

    describe('when err.statusCode exists', () => {
      it('should set res.statusCode', (done) => {
        const server = createServer({statusCode: 404})

        request(server)
          .get('/')
          .expect(404, done)
      })
    })

    describe('when err.statusCode and err.status exist', () => {
      it('should prefer err.status', (done) => {
        const server = createServer({statusCode: 400, status: 404})

        request(server)
          .get('/')
          .expect(404, done)
      })
    })
  })

  describe('error value', () => {
    describe('when Error object', () => {
      it('should use "stack" property', (done) => {
        const error = new TypeError('boom!')
        const server = createServer(error)

        request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, error.stack.toString(), done)
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
