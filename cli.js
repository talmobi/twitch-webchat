#!/usr/bin/env node

var tw = require('./index.js')

var argv = require('minimist')(process.argv.slice(2), {
  boolean: ['help', 'version', 'no-color', 'top'],
  alias: {
    h: 'help',
    v: 'version',
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
  , '  --no-color         Do not colorize output'
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

// var channel = argv._[0]
// if (!channel || typeof channel !== 'string' || channel.length < 1) {
//   console.error('Error: Missing channel name!')
//   console.error('')
//   console.error('Example:')
//   console.error('  twitch-webchat totalbiscuit')
//   process.exit()
// }

var channels = argv._
if (!channels || !channels.length || channels.length < 1) {
  console.error('Error! Missing channel: Please specify one or more channel names')
  console.error('')
  console.error('Examples:')
  console.error('  twitch-webchat totalbiscuit')
  console.error('  twitch-webchat totalbiscuit strippin')
  console.error('')
  process.exit()
}

console.error('Opening channels: ' + channels.join(', ') + '...')

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
  if (argv['no-color']) return text
  return ('\u001b[' + code + text + '\u001b[0m')
}

function badgeify (letter, color) {
  return ('[' + cc(letter, c[color]) + '] ')
}

var ctrl = tw.start(channels, function (err, msg) {
  switch (msg.type) {
    case 'chat':
      if (!msg.html || !msg.from) {
        console.log('')
        console.log(' --- unknown message --- ')
        console.log('')
      } else {
        var badgeString = ''

        badgeString += msg.broadcaster ? badgeify('B', 'red') : ''
        badgeString += msg.staff ? badgeify('Staff', 'yellow') : ''

        badgeString += msg.subscriber ?
          badgeify(
            'S' +
            msg.subscriber.replace(/\D+/g, '') +
            (
              msg.subscriber.replace(/\D+/g, '') ?
              msg.subscriber.replace(/[^a-zA-Z]+/g, '')[0]
              : ''
            ) , 'magenta'
          ) : ''

        badgeString += msg.prime ? badgeify('P', 'blue') : ''
        badgeString += msg.moderator ? badgeify('M', 'green') : ''
        badgeString += msg.turbo ? badgeify('T', 'gray') : ''

        badgeString += msg.cheer ?
          badgeify('C' + msg.cheer.replace(/\D+/g, ''), 'cyan') : ''

        var from = cc(msg.from, c['gray'])
        var text = msg.text

        console.log('  [' + msg.channel + '] ' + badgeString + ' ' + from + ': ' + text)
      }
      break
    case 'system':
      console.log('[$text]'.replace('$text', msg.text))
      break
    case 'tick':
      // console.log('   [' + msg.channel  + ']    DOM POLLED')
      break
    case 'exit':
      process.exit()
      break
    default:
      if (msg.from) {
        console.log('[' + msg.type + '] ' + msg.from + ': ' + msg.text)
      } else {
        console.log('[' + msg.type + '] ' + msg.text)
      }
  }
})
