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

    describe('when string', () => {
      it('should  pass-through string', (done) => {
        const server = createServer('boom!')

        request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, 'boom!', done)
      })
    })

    describe('when number', () => {
      it('should stringify number', (done) => {
        const server = createServer(42.1)

        request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, '42.1', done)
      })
    })

    describe('when object', () => {
      it('should use util.inspect', (done) => {
        const server = createServer({hop: 'pop'})

        request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, '{ hop: \'pop\' }', done)
      })
    })

    describe('with "toString" property', () => {
      it('should use "toString" value', (done) => {
        const server = createServer({toString: () => 'boom!'})

        request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect(500, 'boom!', done)
      })
    })
  })

  describe('response content type', () => {
    let error
    let server

    before(() => {
      error = new Error('boom!')
      error.description = 'it went this way'
      server = createServer(error)
    })

    describe('when "Accept: text/html"', () => {
      it('should return a html response', (done) => {
        request(server)
          .get('/')
          .set('Accept', 'text/html')
          .expect('Content-Type', /text\/html/)
          .expect(/<title>Error: boom!<\/title>/)
          .expect(/<h2><em>500<\/em> Error: boom!<\/h2>/)
          .expect(/<li> &nbsp; &nbsp;at/)
          .expect(500, done)
      })

      it('should contain inspected object', (done) => {
        request(createServer({ foo: 'bar', fizz: 'buzz' }))
          .get('/')
          .set('Accept', 'text/html')
          .expect('Content-Type', /text\/html/)
          .expect(/<title>Error<\/title>/)
          .expect(/<h2><em>500<\/em> Error<\/h2>/)
          .expect(/<li>{ foo: &#39;bar&#39;, fizz: &#39;buzz&#39; }<\/li>/)
          .expect(500, done)
      })
    })

    describe('when "Accept: application/json', () => {
      it('should return a json response', (done) => {
        const body = {
          error: {
            message: 'boom!',
            description: 'it went this way',
            stack: error.stack.toString()
          }
        }

        request(server)
          .get('/')
          .set('Accept', 'application/json')
          .expect('Content-Type', /application\/json/)
          .expect(500, body, done)
      })
    })

    describe('when "Accept: text/plain', () => {
      it('should return a plain text response', (done) => {
        request(server)
          .get('/')
          .set('Accept', 'text/plain')
          .expect('Content-Type', /text\/plain/)
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
