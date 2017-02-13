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

  var spawn = tw.spawn(channel, function (err, data) {
    if (err) {
      spawn.kill();
      handleStatus('error: ' + err);
      running = false;
      throw err;
    } else {
      switch (data.type) {
        case 'chat':
            var messages = data.messages;
            //messages.forEach(function (val, ind, arr) {
            //  var message = val;
            //  handleMessage(message.message);
            //});
            handleMessages([data]);
          break;
        case 'info':
            var message = data.message;
            handleStatus('info: ' + data.text);
          break;
      };
    }
  });

  setTimeout(function () {
    handleStatus("timer expired - shutting down.");
    spawn.kill();
    running = false
  }, 30000);
};
