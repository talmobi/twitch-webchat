var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('kiite')(server);

var tw = require('../index.js');

var fs = require( 'fs' )
var path = require( 'path' )
var mustache = require( 'mustache' )

const ONE_SECOND = 1000
const ONE_MINUTE = ONE_SECOND * 60
const THREE_MINUTES = 3 * ONE_MINUTE

var toplist = [ 'ninja' ]


render()

updateTop()

app.get('/', function (req, res) {
  res.sendFile(
    path.join( __dirname, 'index.html' )
  );
});

var sockets = [];
io.on('connect', function (socket) {
  sockets.push(socket);
  console.log("socket connected");
  socket.emit('status', 'Server: Welcome to twitch-webchat demo!');

  socket.on('run', function (channel) {
    channel = channel.trim();

    if (channel.length >= 3 && channel.length < 20 && !/[^a-zA-Z0-9_-]/.test(channel)) {
      if (!running) {
        socket.emit('status', 'request accepted - spinning up a twitch-webchat instance for channel: ' + channel);
        run(channel);
      } else {
        var s = (timeoutTime + currentTime - Date.now() + 2000) / 1000 | 0
        if (s <= 0) s = 0
        socket.emit('status', 'request denied - twitch-webchat already running. Try again in a ' + s + ' seconds.');
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
var timeoutTime = 1000 * 30
var currentTime = Date.now()

function run (channel) {
  running = true;
  currentTime = Date.now()

  var ctrl = tw.start(channel, function (err, message) {
    if (err) throw err
    switch (message.type) {
      case 'chat':
        handleMessages([message]);
        break;
      case 'system':
        handleStatus('system: ' + message.text);
        break;
      case 'tick': break // ignore DOM polling status messages
      case 'exit':
        handleStatus('shutting down');
        break
      default:
        handleStatus('info: ' + message.text);
    };
  });

  setTimeout(function () {
    handleStatus("timer expired - shutting down.");
    ctrl.kill();
    running = false
  }, timeoutTime);
};

function updateTop () {
  console.log( 'getting top list' )
  tw.getTopStreamers( function ( err, list ) {
    if ( list ) {
      toplist = list
      console.log( 'top updated' )
      render()
    }

    setTimeout( updateTop, THREE_MINUTES )
  } )
}

function render () {
  const filepath = path.join( __dirname, 'index.mustache' )
  fs.readFile( filepath, 'utf8', function ( err, text ) {
    const opts = {
      defaultChannel: toplist[ 0 ]
    }
    const output = mustache.render( text, opts )

    const outputPath = path.join( __dirname, 'index.html' )

    fs.writeFile( outputPath, output, function ( err ) {
      if ( err ) throw err
      console.log( 'index.html updated with top: ' + toplist[ 0 ] )
    } )
  } )
}

