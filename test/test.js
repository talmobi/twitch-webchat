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
  t.plan(5)

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
    // t.equal(messages[0].text, 'creating spawn...')
    // t.equal(messages[1].text, 'creating page... ' + channel)
    // t.equal(messages[2].text, 'opening page...')
    // t.equal(messages[3].text, 'page opened and ready [' + channel + ']')
    t.ok(
      chats[0].text.toLowerCase().indexOf('welcome') !== -1,
      'welcome message found'
    )
    t.ok(chats[1].from.length > 0 && chats[1].html.length > 0, 'user message found.')
    // console.log( messages )
    t.equal(messages[messages.length - 1].type, 'exit')
  }
})

test('Get chat messages from multiple live streamer', { timeout: 60 * 1000 }, function (t) {
  t.plan(10)

  var channels = [
    _topChannels[0],
    _topChannels[1],
    _topChannels[2]
  ]

  channels.forEach(function (channel) {
    t.ok(channel && channel.length > 0, 'using top channel from previous test: ' + channel)
  })

  var messages = []
  var count = 0

  var ctrl = tw.start(channels, function (err, message) {
    // console.log( message )
    messages.push(message)
    count++
  })

  console.log('gathering messages...')

  setTimeout(function () {
    ctrl.kill()
    setTimeout(function () {
      check()
    }, 1500)
  }, 40 * 1000)

  function check () {
    var ticks = messages.filter(function (message) { return message.type === 'tick' })
    messages = messages.filter(function (message) { return message.type !== 'tick' })
    var chats = messages.filter(function (message) { return message.type === 'chat' })
    var welcomeMessages = chats.filter(function (message) {
      return (
        message.text.toLowerCase().indexOf('welcome') >= 0
      )
    })
    var userMessages = chats.filter(function (message) {
      return (
        message.from.toLowerCase().length > 0 &&
        // message.from.toLowerCase() !== 'jtv' &&
        message.html.length > 0
      )
    })
    var channel0UserMessages = userMessages.filter(function (message) {
      return message.channel.toLowerCase() === channels[0]
    })
    var channel1UserMessages = userMessages.filter(function (message) {
      return message.channel.toLowerCase() === channels[1]
    })
    var channel2UserMessages = userMessages.filter(function (message) {
      return message.channel.toLowerCase() === channels[2]
    })
    t.ok(ticks.length > 0, 'tick messages found')
    // t.equal(messages[0].text, 'creating spawn...')
    // t.equal(messages[1].text, 'creating page... ' + channels[0])
    t.equal(welcomeMessages.length, 3, 'welcome messages found')
    t.ok(userMessages.length > 10, 'user message found.')
    t.ok(channel0UserMessages.length > 0, 'channel0 messages found.')
    t.ok(channel1UserMessages.length > 0, 'channel1 messages found.')
    t.ok(channel2UserMessages.length > 0, 'channel2 messages found.')
    t.equal(messages[messages.length - 1].type, 'exit')
  }
})
