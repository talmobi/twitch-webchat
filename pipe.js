// usage example: "npm start | node pipe.js"

var readline = require('readline');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', function (line) {
  // consume here
  console.log("piper: " + line);
});
