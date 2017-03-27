'use strict'

// var Nightmare = require('nightmare')
var pinkyjs = require('../haamu/pinky.js')

function getTopStreamers (callback) {
  var url = 'https://www.twitch.tv/directory/all'

  var pinky = pinkyjs.createSpawn()
  pinky.createPage({
    viewportSize: {
      width: 720,
      height: 1280
    }
  }, function (err, page) {
    if (err) return callback(err)

    page.open(url, function (err) {
      if (err) return callback(err)
      // wait for initial load
      page.wait('#directory-list .content .meta .title a', function (err) {
        if (err) return callback(err)
        // setTimeout(function () {
          page.eval(function () {
            var dict = {}
            var anchors = document.querySelectorAll('#directory-list .content .meta .title a')

            for (var i = 0; i < anchors.length; i++) {
              try {
                var a = anchors[i]
                if (a && a.href) dict[a.href] = decodeURI(a.href)
              } catch (err) {}
            }

            // return result to callback funciton [1]
            return Object.keys(dict).map(function (key) {
              return dict[key]
            })
          }, function (err, result) { // get result from page.eval [1]
            if (err) return callback(err)

            var channels = result
            if (channels) { // parse channel url's to simple channel names
              channels = channels.map(function (channel) {
                while (channel[channel.length - 1] === '/') {
                  channel = channel.substr(0, channel.length - 1)
                }
                return channel.split('/').reverse()[0]
              })
              // return to user specified callback function
              callback(undefined, channels)
              pinky.exit()
            } else {
              // return to user specified callback function
              callback(undefined, [])
              pinky.exit()
            }

          })
        // }, 1000)
      })
    })
  })
} // eof getTopStreamers fn

function createTimeBucket (interval) {
  var _startTime = Date.now()
  var _bucket = []

  return {
    add: function (data) {
      var time = Date.now()
      _bucket.push({
        data: data,
        time: time
      })
    },
    get: function () {
      var time = Date.now()
      while (_bucket[0].time < (time - interval)) {
        _bucket.shift()
      }
      return _bucket.map(function (item) {
        return item.data
      })
    },
    delta: function () {
      var delta = Date.now() - _startTime
      if (delta > interval) return interval
      return delta
    }
  }
}

function start (opts, callback) {
  var
    _channel = opts,
    _interval = 1000,
    _flexible = false,
    _running = true,
    _timeBucket = createTimeBucket(_interval * 10) // 10 second time bucket

  if (typeof opts === 'object') {
    _channel = opts.channel
    _interval = opts.interval || interval
    _flexible = !!(opts.flexible || flexible)
    callback = opts.callback || callback
  }

  if (_interval < 1000) {
    throw new Error('Error: Selected DOM Polling interval time [' + _interval +'] is stupidly low (below 1000ms).')
  }

  if (typeof _channel !== 'string') {
    throw new Error('Error: Channel name missing: A channel name must be provided as the first argument or within the options object')
  }
  if (typeof callback !== 'function') {
    throw new Error('Error: Missing callback function: A callback function must be provided as the second argument or within the options object')
  }

  var URL_TEMPLATE = "https://www.twitch.tv/$channel/chat?popout"
  var url = URL_TEMPLATE.replace('$channel', _channel)

  callback(undefined, {
    type: 'debug',
    text: 'creating spawn...'
  })

  var pinky = pinkyjs.createSpawn()

  callback(undefined, {
    type: 'debug',
    text: 'creating page...'
  })

  pinky.createPage({
    viewportSize: {
      width: 420,
      height: 720
    }
  }, function (err, page) {
    if (err) return callback(err)

    callback(undefined, {
      type: 'debug',
      text: 'opening page...'
    })

    page.open(url, function (err) {
      if (err) return callback(err)
      // wait for initial load
      page.wait('.chat-messages .tse-content .chat-line', function (err) {
        if (err) return callback(err)
        callback(undefined, {
          type: 'debug',
          text: 'page opened and ready'
        })

        tick()
        function tick () {
          page.evaluate(function () {
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
                    text) {
                  // special case
                  // Hosting Message, Subscriber Mode, New Subscriber
                  messages.push({
                    type: 'system',
                    text: text && parse(text.textContent)
                  })
                } else {
                  var text = text && parse(text.textContent)

                  var emoticonTooltips = html && html.querySelectorAll('.balloon-wrapper > .balloon--tooltip')
                  // remove emoticon tooltip texts
                  ;[].forEach.call(emoticonTooltips, function (tooltip) {
                    tooltip && tooltip.parentNode && tooltip.parentNode.removeChild(tooltip)
                  })

                  messages.push({
                    type: 'chat',
                    from: from && parse(from.textContent),
                    text: text,
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
          }, function (err, messages) {
            if (err) return callback(err)

            callback(undefined, {
              type: 'tick',
              text: 'DOM polled'
            })

            _timeBucket.add(messages.length)

            messages.forEach(function (message) {
              callback(undefined, message)
            })

            if (_running) {
              if (_flexible) {
                var sum = _timeBucket.get().reduce(function (acc, length) {
                  return acc + length
                }, 1)
                var inverse = 1 / (sum / (_timeBucket.delta() / 1000))
                var flexInterval = _interval
                if (inverse > 1) flexInterval = Math.round(inverse * _interval)
                if (inverse > 10) flexInterval = 10 * _interval
                // console.log(' ---------- inverse: ' + inverse)
                // console.log(' ---------- flexInterval: ' + flexInterval)
                setTimeout(tick, flexInterval) // poll again in an average 1 message per second rate
              } else {
                setTimeout(tick, _interval) // poll again in <interval || 1000> miliseconds
              }
            } else {
              callback(undefined, {
                type: 'exit',
                text: 'exit'
              })
            }
          })
        } // eof tick fn
      }) // eof page.wait fn
    }) // eof page.open fn
  }) // eof pinky.createPage callback fn

  function exit () {
    pinky.exit()
  }

  pinky._spawn.on('exit', function () {
    _running = false
  })

  return {
    kill: exit,
    exit: exit,
    stop: exit
  }
} // eof start fn

module.exports = {
  start: start,
  getTopStreamers: getTopStreamers
}
