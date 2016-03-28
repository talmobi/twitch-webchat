var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

var tw = require('../twitch-webchat.js');

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

var sockets = [];
io.on('connect', function (socket) {
  sockets.push(socket);
  console.log("socket connected");
  socket.emit('status', 'Server: Welcome to twitch-webchat demo!');

  socket.on('run', function (channel) {
    channel = channel.trim();

    if (channel.length >= 3 && channel.length < 20 && !/[^a-zA-Z0-9]/.test(channel)) {
      if (!running) {
        socket.emit('status', 'request accepted - spining up a twitch-webchat instance for channel: ' + channel);
        run(channel);
      } else {
        socket.emit('status', 'request denied - twitch-webchat already running. Try again in a few seconds.');
      }
    } else {
      socket.emit('status', 'request denied - illegal channel name.');
    }
  });

  socket.on('disconnect', function () {
    sockets.splice( sockets.indexOf(socket), 1 );
    console.log("socket disconnected");
  });
});

var port = 30777;
server.listen(port);
console.log("demo server listening on port: %s", port);

function handleMessages (messages) {
  if (messages.length > 0) {
    sockets.forEach(function (socket) {
      socket.emit('messages', messages);
    });
  }
};

function handleStatus (message) {
  sockets.forEach(function (socket) {
    socket.emit('status', message);
  });
};

var running = false;
function run (channel) {
  running = true;

  var api = tw.start(channel, function (err, data) {
    if (err) {
      api.kill();
      running = false;
      if (typeof err === 'string' && err.indexOf('child process (spawn) closed') >= 0) {
        // silently ignore, this is ok
      } else {
        throw err;
      }
    } else {
      switch (data.type) {
        case 'chat messages':
            var messages = data.messages;
            //messages.forEach(function (val, ind, arr) {
            //  var message = val;
            //  handleMessage(message.message);
            //});
            handleMessages(messages);
          break;
        case 'status':
            var message = data.message;
            handleStatus(message);
          break;
      };
    }
  });

  setTimeout(function () {
    handleStatus("timer expired - shutting down.");
    api.kill();
  }, 30000);
};
