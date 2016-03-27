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

function start (callback) {

  // create the child process spawn
  var spawn = childProcess.spawn(binPath, childArgs);

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
} else {
  start(function (err, data) {
    console.log("stdout: " + data);
  });
}
