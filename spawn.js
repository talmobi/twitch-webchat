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

function start (channel, callback) {
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
    //console.log("stdout: %s", data);
    callback(null, JSON.parse(data));
  });

  spawn.stderr.on('data', function (data) {
    console.log("stderr: %s", data);
  });

  spawn.on('close', function (code) {
    console.log("child process (spawn) exited with code: %s", code);
  });

  spawn.on('error', function (err) {
    console.error(err);
  });

};

if (module !== 'undefined' && module.exports) {
  module.exports = {
    start: start
  };
}
