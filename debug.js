var tw = require('./index.js')

// tw.getTopStreamers(function (err, channels) {
//   if (err) throw err
//   console.log(channels)
// })

tw.start({
  channel: 'summit1g',
  // channel: 'admiralbulldog',
  // channel: 'totalbiscuit',
  interval: 1500,
  flexible: true
}, function (err, message) {
  if (err) throw err
  var type = message.type
  var text = message.text

  switch (type) {
    case 'debug':
      console.log('debug: ' + text)
      break
    case 'chat':
      console.log(message.from + ': ' + message.text)
      break
    case 'system':
      console.log('  [SYSTEM]: ' + message.text)
      break
    case 'tick':
      console.log('  --- DOM Polled ---  ')
      break
    default: // ignore
  }
})
