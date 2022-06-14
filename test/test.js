var tw = require('../index.js')

var test = require('tape')

var _topChannels

test('getTopStreamers name is correct', { timeout: 30 * 1000 }, function (t) {
  t.plan(1)

  t.equal( tw.getTopStreamers.name, 'getTopStreamers', 'name is correct!' )
})


test('Get list of top live streamers', { timeout: 30 * 1000 }, function (t) {
  t.plan(5)

  tw.getTopStreamers(function (err, channels) {
    t.error(err, 'no errors getting top live streamers')
    t.ok(Array.isArray(channels), 'got array of channels')
    t.ok(channels.length > 0, 'non-empty array')
    t.equal(typeof channels[0], 'string')
    t.ok(channels[0].length > 0, 'found top channel: ' + channels[0])
    _topChannels = channels.slice()
  })
})

test('Get list of top live streamers 10 times with 1 call', { timeout: 30 * 1000 }, function (t) {
  t.plan(2 * 10)

  let _channels = undefined

  for ( let i = 0; i < 10; i++ ) {
    tw.getTopStreamers(function (err, channels) {
      t.error(err, 'no errors getting top live streamers')

      if ( !_channels ) _channels = channels

      t.deepEqual(_channels, channels, 'channels got in bulk are the same OK!')
    })
  }
})

test('Get chat messages from top live streamer', { timeout: 60 * 1000 }, function (t) {
  t.plan(6)

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
    var systemMessages = messages.filter(function (message) { return message.type === 'system' })
    var chats = messages.filter(function (message) { return message.type === 'chat' })
    t.ok(ticks.length > 0, 'tick messages found')
    // t.equal(messages[0].text, 'creating spawn...')
    // t.equal(messages[1].text, 'creating page... ' + channel)
    // t.equal(messages[2].text, 'opening page...')
    // t.equal(messages[3].text, 'page opened and ready [' + channel + ']')
    t.ok( chats && chats.length >= 1, 'user chat messages found' )
    t.ok(
      systemMessages[0].text.toLowerCase().indexOf('welcome to the chat') >= 0,
      'system welcome message found'
    )
    t.ok(chats[1].from && chats[1].text && chats[1].html, 'user message found.')
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

  var _messages = []
  var count = 0

  var _timeout
  var _done = false

  var ctrl = tw.start(channels, function (err, message) {
    if ( err ) throw err

    // console.log( message )
    _messages.push(message)
    count++

    if ( preCheck() && !_done ) {
      _done = true

      console.log( 'precheck ok' )

      clearTimeout( _timeout )
      ctrl.kill()
      setTimeout(function () {
        check()
      }, 1500)
    }
  })

  console.log('gathering messages...')

  // timeout if precheck never finishes
  _timeout = setTimeout(function () {
    ctrl.kill()
    setTimeout(function () {
      check()
    }, 1500)
  }, 40 * 1000)

  function preCheck () {
    var messages = _messages.slice()

    var ticks = messages.filter(function (message) { return message.type === 'tick' })
    messages = messages.filter(function (message) { return message.type !== 'tick' })
    var systemMessages = messages.filter(function (message) { return message.type === 'system' })
    var chats = messages.filter(function (message) { return message.type === 'chat' })
    var welcomeMessages = systemMessages.filter(function (message) {
      return (
        message.text.toLowerCase().indexOf('welcome to the chat') >= 0
      )
    })
    var userMessages = chats.filter(function (message) {
      return (
        message.from.toLowerCase() && message.html && message.text
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

    return (
      ( ticks.length > 0 ) &&
      ( welcomeMessages.length === 3 ) &&
      ( userMessages.length > 10 ) &&
      ( channel0UserMessages.length > 0 ) &&
      ( channel1UserMessages.length > 0 ) &&
      ( channel2UserMessages.length > 0 )
    )
  }

  function check () {
    var messages = _messages.slice()

    var ticks = messages.filter(function (message) { return message.type === 'tick' })
    messages = messages.filter(function (message) { return message.type !== 'tick' })
    var systemMessages = messages.filter(function (message) { return message.type === 'system' })
    var chats = messages.filter(function (message) { return message.type === 'chat' })
    var welcomeMessages = systemMessages.filter(function (message) {
      return (
        message.text.toLowerCase().indexOf('welcome to the chat') >= 0
      )
    })
    var userMessages = chats.filter(function (message) {
      return (
        message.from.toLowerCase() && message.html && message.text
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
