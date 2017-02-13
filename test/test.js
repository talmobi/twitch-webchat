var tw = require('../twitch-webchat.js');

var test = require('tape')
var request = require('request');

var getTopStreamers = require('../get-top-twitch-streamers.js').fetch

test('Get chat messages from top live streamer', function (t) {
  t.plan(3 + 3 + 1 + 1 + 3)
  getTopStreamers(function (err, channels) {
    t.error(err, 'successfully got top channel')
    t.ok(Array.isArray(channels), 'an array of top channels was returned')
    var topChannel = channels[0] // top channel probably has a lot of chat activity we can test against
    t.ok(typeof topChannel === 'string', 'top channel found: ' + topChannel)

    var buffer = []
    var userMessageFound = false
    var _infoChecksCompleted = false

    var _timeout = setTimeout(function () {
      t.fail("test timed out, didn't receive enough chat messages")
    }, 16 * 1000)

    var spawn = tw.spawn(topChannel, function (err, message) {
      switch (message.type) {
        case 'chat':
          buffer.push(message)
          if (buffer.length === 1) { // first/welome message
            t.error(err, 'no errors getting welcome message')
            t.equal(message.from.toLowerCase(), 'jtv', 'message.from was jtv')
            t.ok(message.text.toLowerCase().indexOf('welcome') !== -1, 'welcome message received')
          }

          if (!userMessageFound && message.from.toLowerCase() !== 'jtv') {
            t.ok(message.from, 'a live user message was received from: ' + message.from)
            if (message.from) userMessageFound = true
            clearTimeout(_timeout)
            setTimeout(finish, 250)
          }
          break
        case 'info':
          // console.log('info: ' + message.text)
          if (!_infoChecksCompleted) {
            if (message.text === 'opening page...') t.pass('info: opening page... log received')
            if (message.text === 'page opened') t.pass('info: page opened log received')
            if (message.text === 'DOM polled') {
              t.pass('info: DOM polled log received')
              _infoChecksCompleted = true
            }
          }
      }
    })

    function finish () {
      spawn.kill()
      var size = buffer.length
      setTimeout(function () {
        t.equal(size, buffer.length, 'no new messages after spawn.kill()')
      }, 3000)
    }
  })
})
