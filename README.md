# twitch-webchat - simple consumption/logging of twitch web chat (non IRC) through phantomjs

## Simple to use
```js
var tw = require('twitch-webchat');
var channel = 'sodapoppin';
var controls = tr.spawn( channel, function (err, data) {
  if (err) throw err;

  switch (data.type) {
    case 'chat messages':
        var messages = data.messages;
        messages.forEach(function (val, ind, arr) {
          var message = val;
          console.log(message.from + ": " + message.text);
          // message.html for raw html (including emoticon img tags)
          });
      break;
    case 'status':
        // process logs (starting, page open, kill request)
        var message = data.message;
        console.log(message);
      break;
  };
});

// controls.spawn - access to underlying childProcess.spawn running phantomjs
// controls.kill() - kill phantojs and childProcess.spawn
```

## Demo
[http://twitchwebchat.jin.fi/](http://twitchwebchat.jin.fi)

## About
Consume chat message from the web version of twitch chat (non IRC). Rquired no login.

## How
Using phantomjs we can run a headless browser environment to connect to twitch chat and
polling (default every 1000 ms) the DOM for changes.

## Installation
from npm
```js
npm install twitch-webchat
```
from source
```js
git clone https://github.com/talmobi/twitch-webchat
cd twitch-webchat
npm install
```

## Requirements
NodeJS

## API
```js
module.exports = {
  spawn: function ( channel:String || opts:Object, callback (err, data) )
  /*
   * @return {object} controls - exploses the underlying childProcess.spawn and
   *                              a kill() function to kill the process
   *                     controls.spawn {object} -  underlying spawn object
   *                     controls.kill {function} - kills the spawn process
   *
   * @params {string} channel - channel name
   *   or
   *  @params {object} opts
   *                     opts.channel - channel name
   *                     opts.interval - DOM polling interval (default 1000 ms)
   *
   * @params {function} callback - (err, data)
   *                       err - errors
   *                       data - data received
   *                         data.type - 'status' or 'chat messages'
   *                         data.message - if type === 'status'
   *                         data.messages - if type === 'chat messages', array of messages

   *                           message in data.messages
   *                             message.from = (".from").text(); // username, text only
   *                             message.html = (".message").html(); // raw html
   *                             message.text = (".message").text(); // chat message, text only
   */
};
```
