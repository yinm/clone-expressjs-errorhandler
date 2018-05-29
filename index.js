'use strict'

/**
 * Module dependencies.
 * @private
 */
const accepts = require('accepts')
const escapeHtml = require('escape-html')
const fs = require('fs')
const path = require('path')
const util = require('util')

/**
 * Module variables.
 * @private
 */
const DOUBLE_SPACE_REGEXP = /\x20{2}/g
const NEW_LINE_REGEXP = /\n/g
const STYLESHEET = fs.readFileSync(path.join(__dirname, '/public/style.css'), 'utf8')
const TEMPLATE = fs.readFileSync(path.join(__dirname, '/public/error.html'), 'utf8')
const inspect = util.inspect
const toString = Object.prototype.toString

/* istanbul ignore next */
const defer = typeof setImmediate === 'function'
  ? setImmediate
  : function (fn) { process.nextTick(fn.bind.apply(fn, arguments)) }

/**
 * Error handler:
 *
 * Development error handler, providing stack traces
 * and error message responses for requests accepting text, html,
 * or json.
 *
 * Text:
 *
 *  By default, and when _text/plain_ is accepted a simple stack trace
 *  or error message will be returned.
 *
 * JSON:
 *
 *  When _application/json_ is accepted, connect will respond with
 *  an object in the form of `{ "error": error }`.
 *
 * HTML:
 *
 *  When accepted connect will output a nice html stack trace.
 *
 * @return {Function}
 * @api public
 */
exports = module.exports = function errorHandler(options) {
  // get environment
  const env = process.env.NODE_ENV || 'development'

  // get options
  const opts = options || {}

  // get log option
  let log = opts.log === undefined
    ? env !== 'test'
    : opts.log

  if (typeof log !== 'function' && typeof log !== 'boolean') {
    throw new TypeError('option log must be function or boolean')
  }

  // default logging using console.error
  if (log === true) {
    log = logerror
  }

  return function errorHandler(err, req, res, next) {
    // respect err.statusCode
    if (err.statusCode) {
      res.statusCode = err.statusCode
    }

    // respect err.status
    if (err.status) {
      res.statusCode = err.status
    }

    // default status code to 500
    if (res.statusCode < 400) {
      res.statusCode = 500
    }

    // log the error
    let str = stringify(err)
    if (log) {
      defer(log, err, str, req, res)
    }

    // cannot actually respond
    if (res._header) {
      return req.socket.destroy()
    }

    // negotiate
    const accept = accepts(req)
    const type = accept.type('html', 'json', 'text')

    // Security header for content sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')


    // html
    if (type === 'html') {
      const isInspect = !err.stack && String(err) === toString.call(err)
      const errorHtml = !isInspect
        ? escapeHtmlBlock(str.split('\n', 1)[0] || 'Error')
        : 'Error'
      const stack = !isInspect
        ? String(str).split('\n').slice(1)
        : [str]
      const stackHtml = stack
        .map(v => `<li>${escapeHtmlBlock(v)}</li>`)
        .join('')

      const body = TEMPLATE
        .replace('{style}', STYLESHEET)
        .replace('{stack}', stackHtml)
        .replace('{title}', escapeHtml(exports.title))
        .replace('{statusCode}', res.statusCode)
        .replace(/{error}/g, errorHtml)
      res.setHeader('Content-Type', 'text/html: charset=utf-8')
      res.end(body)
    // json
    } else if (type === 'json') {
      let error = { message: err.message, stack: err.stack }
      for (let prop in err) error[prop] = err[prop]
      const json = JSON.stringify({ error: error }, null, 2)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(json)
    // plain text
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(str)
    }
  }
}

/**
 * Template title, framework authors may override this value.
 */
exports.title = 'Connect'

/**
 * Escape a block of HTML, preserving whitespace.
 * @api private
 */
function escapeHtmlBlock(str) {
  return escapeHtml(str)
    .replace(DOUBLE_SPACE_REGEXP, '&nbsp;')
    .replace(NEW_LINE_REGEXP, '<br>')
}

