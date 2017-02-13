var path = require('path')
var childProcess = require('child_process')

// locate phantomjs prebuilt binary
var phantomjs = require('phantomjs-prebuilt')
var binPath = phantomjs.path

var childArgs = [
  '--web-security=no', // enable xss (required for twitch chat)
  path.join(__dirname, 'get-top-twitch-streamers.phantom.js')
];

exports.fetch = function (callback) {
  // create the child process spawn
  var spawn = childProcess.spawn(binPath, childArgs);

  process.on('close', cleanup)
  process.on('exit', cleanup)
  process.on('error', cleanup)

  var buffer = ''
  spawn.stdout.on('data', function (data) {
    buffer += data.toString()
  })

  spawn.on('close', function () {
    console.log('spawn close')
    console.log('buffer: ' + buffer.trim())
    try {
      var channels = JSON.parse(buffer)
      console.log('top channel: ' + channels[0])
      callback(undefined, channels)
    } catch (err) {
      callback(err)
    }
  })

  spawn.stderr.on('data', function (err) {
    callback(err)
    cleanup()
  })

  function cleanup () {
    console.log('cleaning up')
    try {
      spawn.kill()
    } catch (err) {}
    try {
      process.kill(spawn)
    } catch (err) {}
  }
}
