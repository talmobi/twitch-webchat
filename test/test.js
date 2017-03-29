var tw = require('../index.js')

var test = require('tape')

var _topChannels

test('Get list of top live streamers', { timeout: 30 * 1000 }, function (t) {
  t.plan(5)
  tw.getTopStreamers(function (err, channels) {
    t.error(err)
    t.ok(Array.isArray(channels), 'got array of channels')
    t.ok(channels.length > 0, 'non-empty array')
    t.equal(typeof channels[0], 'string')
    t.ok(channels[0].length > 0, 'found top channel: ' + channels[0])
    _topChannels = channels.slice()
  })
})

test('Get chat messages from top live streamer', { timeout: 60 * 1000 }, function (t) {
  t.plan(9)

  var channel = _topChannels[0]
  t.ok(channel && channel.length > 0, 'using top channel from previous test: ' + channel)

  var messages = []
  var count = 0
  var ctrl = tw.start(channel, function (err, message) {
    messages.push(message)
    count++
    if (count === 20) {
      ctrl.kill()
      setTimeout(function () {
        check()
      }, 1500)
    }
  })

  function check () {
    var ticks = messages.filter(function (message) { return message.type === 'tick' })
    messages = messages.filter(function (message) { return message.type !== 'tick' })
    var chats = messages.filter(function (message) { return message.type === 'chat' })
    t.ok(ticks.length > 0, 'tick messages found')
    t.equal(messages[0].text, 'creating spawn...')
    t.equal(messages[1].text, 'creating page...')
    t.equal(messages[2].text, 'opening page...')
    t.equal(messages[3].text, 'page opened and ready')
    t.ok(
      chats[0].from.toLowerCase() === 'jtv' &&
      chats[0].text.toLowerCase().indexOf('welcome') !== -1,
      'jtv welcome message found'
    )
    t.ok(chats[1].from.length > 0 && chats[1].html.length > 0, 'user message found.')
    t.equal(messages[messages.length - 1].type, 'exit')
  }
})
