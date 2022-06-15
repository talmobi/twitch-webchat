[![npm](https://img.shields.io/npm/v/twitch-webchat.svg?maxAge=3600)](https://www.npmjs.com/package/twitch-webchat)
[![npm](https://img.shields.io/npm/dm/twitch-webchat.svg?maxAge=3600)](https://www.npmjs.com/package/twitch-webchat)
[![npm](https://img.shields.io/npm/l/twitch-webchat.svg?maxAge=3600)](https://www.npmjs.com/package/twitch-webchat)

# twitch-webchat ![](https://static-cdn.jtvnw.net/emoticons/v1/25/1.0)
Simple consumption/logging of twitch web chat (non IRC) using puppeteer

![](https://i.imgur.com/H03qXMW.gif)

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
Using [puppeteer](https://github.com/GoogleChrome/puppeteer) we can run a headless browser environment to connect to twitch chat and
poll (default every 1000 ms) the DOM for changes.

## Why
For fun.. was interesting to see how you would be able to consume/parse content generated from a dynamic web page. It's much more complicated than consuming static, pre-rendered content. Can't simply use something like cheerio and plain old HTTP requests. The answer being headless browsers.

## For who?
Kappa

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

## API
```js
module.exports = {
  start: function ( channel:String || opts:Object, callback (err, data) )
  /*
   * @desc Open and start polling the DOM for chat messages for the given channel.
   *
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

  getTopStreamers: function (err, channels)
  /*
   * @desc Get a list of the current top twitch streamers (from https://twitch.tv/directory/all)
   *
   * @params {function} callback - callback function
   *              @params {Error} err
   *              @params {Array.<string>} channels - array of channel names
   */
};
```

## CLI

A simple Command Line Interface is also included
```bash
$ npm install -g twitch-webchat
$ twitch-webchat --help

Usage: twitch-webchat [options] <channel>

Examples:

  twitch-webchat totalbiscuit
  twitch-webchat --color sodapoppin
  twitch-webchat -h

Options:

  -t, --top          List current top live streamers

  -c, --color        Colorize output

  -v, --version      Display version
  -h, --help         Display help (this text)
```

## Test
```js
npm test
```

## TODO - Support global and channeled enabled emotes from third parties
#### FFZ
```bash
  global: 'https://api.frankerfacez.com/v1/set/global'
  user/channel: 'https://api.frankerfacez.com/v1/room/id/:userId'
```
#### BTTV
```bash
  global: 'https://api.betterttv.net/3/cached/emotes/global'
  user/channel: 'https://api.betterttv.net/3/users/twitch/:userId'
```
#### 7TV
```bash
  global: 'https://api.7tv.app/v2/emotes/global'
  user/channel: 'https://api.7tv.app/v2/users/:userId/emotes'
```

## LICENSE
MIT
