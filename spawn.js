// consume from spawn

var path = require('path');
var childProcess = require('child_process');

// locate phantomjs prebuilt binary
var phantomjs = require('phantomjs-prebuilt');
var binPath = phantomjs.path;

var childArgs = [
  "--web-security=no", // enable xss (required for twitch chat)
  path.join(__dirname, "index.js")
];

function start (opts, callback) {
  var channel = opts;
  if (typeof opts === 'object') {
    channel = opts.channel;
  }

  if (typeof channel !== 'string') {
    throw new Error("Please specify a channel name (string) as the first argument.");
  }
  if (typeof callback !== 'function') {
    throw new Error("Please specify a callback function as the last argument.");
  }

  // create the child process spawn
  var spawn = childProcess.spawn(binPath, childArgs, {env: {channel: channel}});

  // configure consumers
  spawn.stdout.on('data', function (data) {
    //console.log("stdout: <\n%s\n>", data);
    var split = data.toString().split('\n');
    for (var i = 0; i < split.length; i++) {
      var trim = split[i].trim();
      if (trim && trim.length > 0) {
        try {
          callback(null, JSON.parse(trim));
        } catch (err) {
          callback(err, null);
        }
      }
    }
  });

  spawn.stderr.on('data', function (data) {
  });

  spawn.on('close', function (code) {
    callback(null, {
      type: 'status',
      message: 'closed'
    });
    callback("child process (spawn) exited with code: " + code, null);
  });

  spawn.on('error', function (err) {
    callback(err, null);
  });

  // return api
  return {
    // expose spawn
    spawn: spawn,

    // process shutdown fn
    kill: function () {
      callback(null, {
        type: 'status',
        message: "kill requested"
      });
      spawn.stdin.pause();
      spawn.kill();
    }
  };
};

if (module !== 'undefined' && module.exports) {
  module.exports = {
    start: start
  };
}
