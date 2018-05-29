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
