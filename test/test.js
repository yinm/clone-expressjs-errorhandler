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

})