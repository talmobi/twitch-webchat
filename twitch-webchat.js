'use strict'

var path = require('path')
var childProcess = require('child_process')

// locate phantomjs prebuilt binary
var phantomjs = require('phantomjs-prebuilt')
var binPath = phantomjs.path

var childArgs = [
  "--web-security=no", // enable xss (required for twitch chat)
  path.join(__dirname, "index.phantom.js")
]

function spawn (opts, callback) {
  var channel = opts
  var interval = 1000
  if (typeof opts === 'object') {
    channel = opts.channel
    interval = opts.interval || 1000
    callback = opts.callback || callback
  }

  var env = {
    channel: channel,
    interval: interval
  };

  if (typeof channel !== 'string') {
    throw new Error('Error: Channel name missing: A channel name must be provided as the first argument or within the options object')
  }
  if (typeof callback !== 'function') {
    throw new Error('Error: Missing callback function: A callback function must be provided as the second argument or within the options object')
  }

  // create the child process spawn
  var spawn = childProcess.spawn(binPath, childArgs, {env: env});

  // bind cleanup functions (makes sure the underlying phantomjs process gets cleaned up when the main process exits)
  process.on('close', cleanup)
  process.on('exit', cleanup)
  process.on('error', cleanup)

  function cleanup () {
    // console.log('cleaning up')
    try {
      spawn.kill()
    } catch (err) {}
    try {
      process.kill(spawn)
    } catch (err) {}
  }

  // configure consumers
  var buffer = ''
  spawn.stdout.on('data', function (data) {
    buffer += data.toString()
    var split = buffer.split('\n');
    buffer = split[split.length - 1]

    for (var i = 0; i < split.length - 1; i++) {
      var trim = split[i].trim();
      if (trim && trim.length > 0) {
        try {
          // console.log('trim: ' + trim)
          var p = JSON.parse(trim);
          switch (p.type) {
            case 'messages':
              p.messages.forEach(function (message) {
                callback(undefined, message);
              })
              break
          }
        } catch (err) {
          callback(err);
        }
      }
    }
  });

  spawn.stderr.on('data', function (data) {
    callback(data)
  });

  return spawn // return underlying spawn
};

module.exports.spawn = spawn
