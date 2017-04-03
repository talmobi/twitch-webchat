'use strict'

// var Nightmare = require('nightmare')
// var pinkyjs = require('../haamu/pinky.js')
var pinkyjs = require('../pinkyjs/pinky.js')

function getTopStreamers (callback) {
  var url = 'https://www.twitch.tv/directory/all'

  var pinky = pinkyjs.createSpawn()
  pinky.createPage({
    viewportSize: {
      width: 720,
      height: 1280
    },
    settings: {
      loadImages: false
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
    _channels = opts,
    _interval = 1000,
    _flexible = false,
    _running = true,
    _timeBucket = createTimeBucket(_interval * 10) // 10 second time bucket

  if (typeof _channels === 'string') _channels = [_channels]

  if (typeof opts === 'object' && !(opts instanceof Array)) {
    _channels = opts.channel || opts.channels
    _interval = opts.interval || _interval
    _flexible = !!(opts.flexible || _flexible)
    callback = opts.callback || callback
  }

  if (_interval < 1000) {
    throw new Error('Error: Selected DOM Polling interval time [' + _interval +'] is stupidly low (below 1000ms).')
  }

  if (!(_channels instanceof Array)) {
    throw new Error('Error! Channel missing: No channel or channels specified.')
  }
  if (typeof callback !== 'function') {
    throw new Error('Error! Missing callback function: A callback function must be provided as the second argument or within the options object.')
  }

  var URL_TEMPLATE = "https://www.twitch.tv/$channel/chat?popout"

  callback(undefined, {
    type: 'debug',
    text: 'creating spawn...'
  })

  var pinky = pinkyjs.createSpawn()

  _channels.forEach(function (channel, index) {
    setTimeout(function () {
      channel = channel.toLowerCase().trim()
      if (channel[0] === '#') channel = channel.slice(1)
      var url = URL_TEMPLATE.replace('$channel', channel)

      callback(undefined, {
        type: 'debug',
        text: 'creating page... ' + channel
      })

      pinky.createPage({
        viewportSize: {
          width: 375,
          height: 300
        },
        settings: {
          loadImages: false
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
              text: 'page opened and ready [' + channel + ']'
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
                  var cheer = undefined
                  var turbo = undefined
                  var staff = undefined
                  var broadcaster = undefined

                  var badges = line.querySelectorAll('.badge')
                  ;[].forEach.call(badges, function (item) {
                    var itemText = (
                      item['alt'] || item['original-title'] || item.textContent
                    ).trim()
                    var t = itemText.toLowerCase()

                    if (t.indexOf('broadcast') !== -1) {
                      broadcaster = itemText
                    }

                    if (t.indexOf('staff') !== -1) {
                      staff = itemText
                    }

                    if (t.indexOf('cheer') !== -1) {
                      cheer = itemText
                    }

                    if (t.indexOf('turbo') !== -1) {
                      turbo = itemText
                    }

                    if (t.indexOf('moderator') !== -1) {
                      moderator = itemText
                    }

                    if (t.indexOf('subscriber') !== -1) {
                      subscriber = itemText
                    }

                    if (t.indexOf('prime') !== -1) {
                      prime = itemText
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
                        prime: prime,
                        cheer: cheer,
                        turbo: turbo,
                        staff: staff,
                        broadcaster: broadcaster
                      })
                    }
                  } else if (system) { // system message
                    messages.push({
                      type: 'system',
                      from: from && parse(from.textContent),
                      text: system && parse(system.textContent)
                    })
                  } else { // unknown message
                    var deleted = line.querySelector('.deleted')
                    if (deleted) {
                      messages.push({
                        type: 'deleted',
                        from: from && parse(from.textContent),
                        text: deleted && parse(deleted.textContent)
                      })
                    } else {
                      messages.push({
                        type: 'unknown',
                        from: from && parse(from.textContent),
                        text: text && parse(text.textContent)
                      })
                    }
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

                if (messages && messages instanceof Array) {
                  _timeBucket.add(messages.length)
                  messages.forEach(function (message) {
                    message.channel = channel
                    callback(undefined, message)
                  })
                } else {
                  callback(undefined, {
                    type: 'error',
                    text: 'Error! DOM evaluation did not return an array of messages...'
                  })
                }

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
    }, index * 5000 + 500)
  })

  function exit () {
    if (_running) {
      _running = false
      callback(undefined, {
        type: 'exit',
        text: 'exit'
      })
    }
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
  spawn: start,
  getTopStreamers: getTopStreamers
}
