'use strict'

var Nightmare = require('nightmare')

module.exports = function twitchWebchat (opts, callback) {
  var
    channel = opts,
    interval = 1000

  if (typeof opts === 'object') {
    channel = opts.channel
    interval = opts.interval || interval
    callback = opts.callback || callback
  }

  var URL_TEMPLATE = "https://www.twitch.tv/$channel/chat?popout"
  var url = URL_TEMPLATE.replace('$channel', channel)

  var nightmare = Nightmare({
    width: 420,
    height: 720,
    show: false
  })

  if (typeof channel !== 'string') {
    throw new Error('Error: Channel name missing: A channel name must be provided as the first argument or within the options object')
  }
  if (typeof callback !== 'function') {
    throw new Error('Error: Missing callback function: A callback function must be provided as the second argument or within the options object')
  }

  callback(undefined, {
    type: 'opening',
    text: 'opening page...'
  })

  nightmare
    .goto(url) // open twitch chat
    .wait('.chat-messages .tse-content .chat-line') // wait for initial load
    .then(function () {
      callback(undefined, {
        type: 'ready',
        text: 'page ready'
      })

      tick() // start polling the DOM for chat messages
      function tick () {
        // console.log('tick, ended: ' + nightmare.ended)
        nightmare
          .evaluate(function () {
            var lines = document.querySelectorAll('.chat-messages .tse-content .chat-line')

            if (!(lines && lines.length > 0)) return []

            function parse (text) {
              return text
                .split(/[\r\n]/g)
                .map(function(str) { return str.trim() })
                .filter(function (str) {
                  return str.trim().length !== 0
                })
                .join(' ')
                .trim()
            }

            var messages = []
            ;[].forEach.call(lines, function (line) {
              var from = line.querySelector('.from')
              var text = line.querySelector('.message')
              var html = line.querySelector('.message')

              var system = line.querySelector('.system-msg')

              var moderator = undefined
              var subscriber = undefined
              var prime = undefined

              var badges = line.querySelectorAll('.badges .balloon')
              ;[].forEach.call(badges, function (item) {
                var text = item.textContent.trim()
                if (text.toLowerCase().indexOf('moderator') !== -1) {
                  moderator = text
                }
                if (text.toLowerCase().indexOf('subscriber') !== -1) {
                  subscriber = text
                }
                if (text.toLowerCase().indexOf('prime') !== -1) {
                  prime = text
                }
              })

              // user message
              if (from && text && html) {
                if (from &&
                    parse(from.textContent).length === 0 &&
                    text &&
                    parse(text.textContent)
                      .toLowerCase()
                      .indexOf('hosting') !== -1) {
                  // special case Hosting Message
                  messages.push({
                    type: 'system',
                    text: text && parse(text.textContent)
                  })
                } else {
                  messages.push({
                    type: 'chat',
                    from: from && parse(from.textContent),
                    text: text && parse(text.textContent),
                    html: html && parse(html.innerHTML),
                    moderator: moderator,
                    subscriber: subscriber,
                    prime: prime
                  })
                }
              } else if (system) { // system message
                messages.push({
                  type: 'system',
                  text: system && parse(system.textContent)
                })
              } else { // unknown message
                messages.push({
                  type: 'unknown',
                  text: text && parse(line.textContent)
                })
              }
            })

            // remove the parsed messages from the DOM
            ;[].forEach.call(lines, function (line) {
              line && line.parentNode && line.parentNode.removeChild(line)
            })

            // return the data back to our script context
            // (outside of evaluate)
            return messages
          })
          .then(function (messages) {
            callback(undefined, {
              type: 'tick',
              text: 'DOM polled'
            })

            messages.forEach(function (message) {
              callback(undefined, message)
            })

            if (!nightmare.ended) setTimeout(tick, interval) // poll again in <interval || 1000> miliseconds
          })
          .catch(function (error) {
            callback(error)
            // throw error
          })
      }
    })
    .catch(function (error) {
      callback(error)
      // throw error
    })

  function exit () {
    callback(undefined, {
      type: 'exit',
      text: 'exit'
    })
    nightmare.end()
    process.exit()
  }

  nightmare.proc.on('close', function () {
    exit()
  })

  return {
    nightmare: nightmare,
    proc: nightmare.proc,
    kill: function () {
      exit()
    }
  }
}
