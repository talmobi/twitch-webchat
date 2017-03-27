#!/usr/bin/env node

var tw = require('./index.js')

var argv = require('minimist')(process.argv.slice(2), {
  boolean: ['help', 'version', 'color', 'top'],
  alias: {
    h: 'help',
    v: 'version',
    c: 'color',
    t: 'top'
  }
})

var usage = [
  ''
  , 'Usage: twitch-webchat [options] <channel>'
  , ''
  , 'Examples:'
  , ''
  , '  twitch-webchat totalbiscuit'
  , '  twitch-webchat --color sodapoppin'
  , '  twitch-webchat -h'
  , ''
  , 'Options:'
  , ''
  , '  -t, --top          List current top live streamers'
  , ''
  , '  -c, --color        Colorize output'
  , ''
  , '  -v, --version      Display version'
  , '  -h, --help         Display help (this text)'
  , ''
].join('\n')

if (argv.help) {
  console.error(usage)
  process.exit()
}

if (argv.version) {
  var json = require('./package.json')
  console.error(json['version'] || json['VERSION'])
  process.exit()
}

if (argv.top) {
  console.error('Fetching top live streamers...')
  return tw.getTopStreamers(function (err, channels) {
    if (err) throw err
    console.log(channels.join('\n'))
    process.exit()
  })
}

var channel = argv._[0]
if (!channel || typeof channel !== 'string' || channel.length < 1) {
  console.error('Error: Missing channel name!')
  console.error('')
  console.error('Example:')
  console.error('  twitch-webchat totalbiscuit')
  process.exit()
}

console.error('Opening channel: ' + channel + '...')

var c = {
  'cyan': '36m',
  'magenta': '35m',
  'blue': '34m',
  'yellow': '33m',
  'green': '32m',
  'red': '31m',
  'gray': '90m',
}

function cc (text, code) {
  if (!argv.color) return text
  return ('\u001b[' + code + text + '\u001b[0m')
}

function badge (letter, color) {
  return ('[' + cc(letter, c[color]) + ']')
}

var ctrl = tw.start(channel, function (err, msg) {
  switch (msg.type) {
    case 'chat':
      if (!msg.html || !msg.from) {
        console.log('')
        console.log(' --- unknown message --- ')
        console.log('')
      } else {
        var badges = ''
        if (msg.moderator) badges += badge('M', 'green')
        if (msg.subscriber) badges += badge('S', 'magenta')
        if (msg.prime) badges += badge('P', 'blue')

        var from = cc(msg.from, c['gray'])
        var text = msg.text

        console.log(badges + from + ': ' + text)
      }
      break
    case 'system':
      console.log('')
      console.log('[$text]'.replace('$text', msg.text))
      console.log('')
      break
    case 'tick': break // ignore DOM polling status messages
    case 'exit':
      process.exit()
      break
    default:
      console.log(msg.type + ': ' + msg.text)
  }
})
