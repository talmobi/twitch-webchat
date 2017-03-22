/* This is a phantomjs script and needs to be run with phantomjs binary */
var system = require('system')
var page = require('webpage').create()
page.viewportSize = {
  width: 420,
  height: 720
}

page.onError = function (msg, trace) {
  var tokens = msg.split(/[ :]/g)
  if (tokens[0].toLowerCase() === 'typeerror') {
    emit({ page: '<ignored> page error: ' + msg })
  } else {
    emit({ pageError: 'page error: ' + msg, text: msg })
  }
}

phantom.onError = function (msg, trace) {
  var msgStack = ['PHANTOM ERROR ' + msg]
  if (trace && trance.length) {
    msgStack.push('TRACE:')
    trace.forEach(function (t) {
      msgStack.push(' -> ' + (t.file || t.source) + ': ' + t.line + (t.function ? ' (in function ' + t.function + ')' : ''))
    })
  }
  // console.error(msgStack.join('\n'))
  emit({ error: msgStack.join('\n'), text: 'phantom error' })
  // phantom.exit(1)
}

// var opts = JSON.parse(system.env.opts)
// var batch = JSON.parse(system.env.batch)

function parseFunctionBody (fn) {
  var str = fn.toString()
  return str.substring(
    str.indexOf('{') + 1,
    str.lastIndexOf('}') - 1
  )
}

// return array of function params
function parseFunctionParams (fn) {
  var str = fn.toString()
  return str.substring(
    str.indexOf('(') + 1,
    str.indexOf(')')
  ).split(',')
    .map(function (param) {
      return param.trim()
    })
}

// console.log(system.env.batch)
var batch = JSON.parse(system.env.batch)

function emit (json) {
  console.log(JSON.stringify(json))
}

var batchIndex = -1
var _lastResult = undefined
function next (result) {
  batchIndex++
  emit({ type: 'next', text: 'next: ' + batchIndex, batchIndex: batchIndex, result: result })
  _lastResult = result

  if (batch.length <= batchIndex) {
    // console.log('batch empty')
    // throw new Error('batch empty')
    // phantomjs.exit()
    emit({ type: 'done' })
    phantom.exit()
  }

  var data = batch[batchIndex]
  switch (data.type) {
    case 'open':
      emit({ text: 'opening page...' })
      try {
        page.open(data.url, function (status) {
          emit({ text: 'open page callback' })
          if (status !== 'success') {
            // console.error('page failed to open')
            emit({ error: 'page failed to open', data: data })
            phantom.exit(1)
          } else {
            emit({ type: 'open', status: 'success' })
            next() // increment batch
          }
        })
      } catch (err) {
        emit({ error: 'page open error', text: err })
      }
      break

    case 'wait':
      var _waitTimedOutTimeout = setTimeout(function () {
        emit({ error: 'wait timed out', data: data })
        phantom.exit(1)
      }, 1000 * 30)
      wait()
      function wait () {
        emit({ text: 'wait triggered: ' })
        var result = page.evaluate(function (querySelector) {
          try {
            return !!document.querySelector(querySelector)
          } catch (err) {
            emit({ text: '---- in phantom catch ----' })
            return false
          }
        }, data.querySelector)
        emit({ text: '  result was: ' + result })
        if (!result) {
          setTimeout(wait, 250) // try again in 250 milliseconds
        } else {
          clearTimeout(_waitTimedOutTimeout)
          next() // increment batch
        }
      }
      break

    case 'then':
      emit({ type: 'then', batchIndex: batchIndex })
      next()
      break

    case 'evaluate':
      var _params = parseFunctionParams(data.callback)
      var _body = parseFunctionBody(data.callback)
      var fn = Function(_params, _body)
      var result = fn()
      emit({ type: 'evaluate', result: result })
      next(result)
      break

    case 'timeout':
      setTimeout(function () {
        var _params = parseFunctionParams(data.callback)
        var _body = parseFunctionBody(data.callback)
        var fn = Function(_params, _body)
        var result = fn()
        emit({ type: 'timeout', result: result })
        next(result)
      }, data.timeout)
      break

    case 'loop':
      emit({ text: 'loop starting' })
      var _loopCounter = -1
      tick()
      function tick () {
        _loopCounter++
        var _params = parseFunctionParams(data.callback)
        var _body = parseFunctionBody(data.callback)
        var fn = Function(_params, _body)
        var result = fn(_loopCounter)
        emit({ type: 'loop', result: result, counter: _loopCounter })

        if (!!result) {
          setTimeout(tick, data.loop)
        } else {
          next(result)
        }
      }
      break

    default:
      emit({ error: 'error unknown function [' + data.type + ']', data: data })
      phantom.exit(1)
  }
}

next()
