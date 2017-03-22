var path = require('path')
var childProcess = require('child_process')
var phantomjs = require('phantomjs-prebuilt')
var binPath = phantomjs.path

var childArgs = [
  '--web-security=false', // enable xhr/xss
  path.join(__dirname, 'haamu.phantom.js')
]

function start () {
  var env = {}
  var batch = []
  var thens = {}
  var batchIndex = 0
  var _lastResult

  var spawn

  function exec (callback) {
    env.batch = JSON.stringify(batch)
    console.log('batch: ' + env.batch)

    spawn = childProcess.spawn(binPath, childArgs, { env: env })
    console.log('spawn created')

    // cleanup spawn on main process exit
    process.on('exit', function () {
      console.log('SPAWN KILLED')
      spawn.kill()
    })
    console.log('attached process.exit cleanup listener')

    spawn.stderr.on('data', function (data) {
      console.error('spawn stderr: ' + data)
    })

    // listen for incoming data
    var buffer = ''
    spawn.stdout.on('data', function (data) {
      buffer += data.toString()
      var split = buffer.split('\n')
      buffer = split[split.length - 1]

      split.slice(0, -1).forEach(function (line) {
        var trim = line.trim()
        console.log('trim: ' + trim)
        if (trim && trim.length > 0) {
          try {
            var json = JSON.parse(trim)

            switch (json.type) {
              case 'next':
                batchIndex = json.batchIndex
                _lastResult = json.result
                break
              case 'then':
                console.log('    type [then] received')
                var fn = thens[json.batchIndex]
                console.log('    fn: ' + (typeof fn))
                fn(_lastResult || undefined)
                break
              case 'done':
                console.log('batch queue finished (empty)')
                console.log('exiting...')
                process.exit()
            }

            if (json.error && (typeof callback === 'function')) {
              callback(new Error(json.error))
            }
          } catch (err) {
            console.log('--- in catch ---')
            if (typeof callback === 'function') callback(err)
            throw err
          }
        }
      })
    })
    console.log('added spawn.stdout data listener')

    console.log('returning spawn')
    return spawn
  }

  function kill () {
    spawn && spawn.kill()
  }

  var api = {
    open: function open (url) {
      console.log('pushing open')
      batch.push({ type: 'open', url: url })
      return api
    },

    wait: function wait (selector) {
      console.log('pushing wait')
      batch.push({ type: 'wait', querySelector: selector })
      return api
    },

    then: function then (callback) {
      console.log('pushing then')
      thens[batch.length] = callback
      batch.push({ type: 'then' })
      return api
    },

    evaluate: function evaluate (callback, argument) {
      console.log('pushing evaluate')
      batch.push({ type: 'evaluate', callback: callback.toString(), argument: argument })
      return api
    },

    timeout: function timeout (callback, timeout) {
      console.log('pushing timeout')
      batch.push({ type: 'timeout', callback: callback.toString(), timeout: timeout })
      return api
    },

    loop: function loop (callback, loop) {
      console.log('pushing loop')
      batch.push({ type: 'loop', callback: callback.toString(), loop: loop })
      return api
    },

    exec: function (callback) {
      console.log('pushing exec')
      exec(callback)
    },

    kill: function () {
      spawn.kill()
    }
  }

  return api
}

var url = 'https://www.twitch.tv/totalbiscuit/chat?popout'
// var url = 'https://www.google.fi'

var spawn = start()
  .open(url)
  .then(function () {
    console.log('--- open then')
  })
  .evaluate(function () {
    var title = page.evaluate(function () {
      return document.title
    })
    return title
  })
  .then(function (result) {
    console.log('--- then result spawn: ' + result)
  })
  .wait('.chat-lines')
  .loop(function (count) {
    var title = page.evaluate(function () {
      return document.title
    })

    if (count > 5) return false // exits loop
    return title
  }, 1000)
  .exec(function (err) {
    if (err) throw err
  })
