# twitch-webchat - simple consumption/logging of twitch web chat (non IRC) through phantomjs

## Simple to use
```js
var tw = require('twitch-webchat');
var channelName = 'totalbiscuit';
var controls = tw.start( channelName, function (err, message) {
  if (err) throw err

  switch (message.type) {
    case 'chat': // chat message from the channel
      var user = message.from
      var text = message.text // chat message content as text string
      var html = message.html // chat message content as html string

      var isModerator = !!message.moderator // user is a moderator
      var isSubscriber = !!message.subscriber // user is a subscriber
      var isPrime = !!message.prime // user is twitch prime member

      console.log(user + ": " + text)
      break
    case 'system': // system message from the channel
      // (subscription messages, channel mode messages etc)
      console.log('[system]: ' + message.text)
      break
    case 'tick': // DOM polled for messages
    case 'debug': // various debug messages
    default: // ignore
  };
});

// controls.stop() - stop polling for chat messages and shut down underlying processes (phantomjs)
// controls.exit() - same as above
// controls.kill() - same as above
```

## Demo
[http://twitchwebchat.jin.fi/](http://twitchwebchat.jin.fi)

## About
Consume chat message from the web version of twitch chat (non IRC). Requires no login.

## How
Using pinkyjs (phantomjs wrapper) we can run a headless browser environment to connect to twitch chat and
poll (default every 1000 ms) the DOM for changes.

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

## Common Issues
Phantomjs has a hidden dependency lacking in some linux distros, see: https://github.com/ariya/phantomjs/issues/10904
To fix simply install it manually with your favourite package manager:
```js
sudo apt-get install libfontconfig
```

## API
```js
module.exports = {
  start: function ( channel:String || opts:Object, callback (err, data) )
  /*
   * @params {string} channel - channel name
   *   or
   * @params {object} opts - options object
   *              opts.channel - channel name
   *              opts.interval - DOM polling interval (default 1000 ms)
   *              opts.flexible - slow down polling interval based on chat messages
                                        per (10 * interval) ratio (capped at 10 * interval)
   *
   * @params {function} callback - DOM polling callback function
   *              err - error || undefined
   *              message - message object
   *                message.type - 'chat', 'system', 'debug' or 'tick'
   *                message.from - message author (username), only if type === 'chat'
   *                message.text - message content as text string
   *                message.html - message content as html string
   *
   *                message.moderator - user is Moderator (moderator text)
   *                message.prime - user is Twitch Prime Subscriber (twitch prime text)
   *                message.subscriber - user is Channel Subscriber (subscriber text)
   */
};
```

## Test
```js
npm test
```

## LICENSE
MIT
