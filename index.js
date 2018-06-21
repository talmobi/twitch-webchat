'use strict'

var Nightmare = require( 'nightmare' )
// var url = 'https://www.twitch.tv/directory/all'

function getTopStreamers ( callback ) {
  var nightmare = Nightmare( {
    show: false
  } )

  var url = 'https://www.twitch.tv/directory/all'

  nightmare
  .goto( url )
  .wait( '.tw-link.tw-link--inherit' )
  .wait( 1000 )
  .evaluate( function ( done ) {
    var dict = {}
    var anchors = [].filter.call(
      document.querySelectorAll(
        'a.tw-link.tw-link--inherit'
      ), function ( el ) {
        console.log( el.href )
        var split = el && el.href && el.href.split( '/' )
        return ( split.length === 4 )
      }
    )

    console.log( 'anchors found: ' + anchors.length )

    for ( var i = 0; i < anchors.length; i++ ) {
      try {
        var a = anchors[ i ]
        if ( a && a.href ) dict[a.href] = decodeURI( a.href.toLowerCase() )
      } catch (err) {}
    }

    // return result to callback funciton [1]
    var list = Object.keys(dict).map(function (key) {
      return dict[key].split( '/' )[ 3 ]
    })

    console.log( 'returning' )
    done( null, list )
  } )
  .end()
  .then( function ( list ) {
    callback( null, list )
  } )
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
    _running = true,
    _timeBucket = createTimeBucket(_interval * 10) // 10 second time bucket

  if (typeof opts === 'object' && !(opts instanceof Array)) {
    _channels = opts.channel || opts.channels
    _interval = opts.interval || _interval
    callback = opts.callback || callback
  }

  if (typeof _channels === 'string') _channels = [_channels]

  if (_interval < 1000) {
    throw new Error('Error: Selected DOM Polling interval time [' + _interval +'] is stupidly low (below 1000ms).')
  }

  if (!(_channels instanceof Array)) {
    throw new Error('Error! Channel missing: No channel or channels specified.')
  }
  if (typeof callback !== 'function') {
    throw new Error('Error! Missing callback function: A callback function must be provided as the second argument or within the options object.')
  }

  // var URL_TEMPLATE = "https://www.twitch.tv/$channel/chat?popout"
  var URL_TEMPLATE = "https://www.twitch.tv/popout/$channel/chat"

  var nightmares = []

  _channels.forEach( function ( channel ) {
    var url = URL_TEMPLATE.replace('$channel', channel)
    // console.log( 'url: ' + url )

    var nightmare = Nightmare( {
      webPreferences: {
        images: false // turn images off ( no need )
      },
      openDevTools: true,
      show: false
    } )

    nightmares.push( nightmare )

    nightmare
    .goto( url )
    .wait( function () {
      const el = document.querySelector( 'div[data-a-target="chat-welcome-message"].chat-line__status' )
      return !!el
    } )
    .then( function ( title ) {
      // console.log( 'great success' )

      tick()
    } )

    function tick () {
      // console.log( ' == CALLING TICK == ' )

      nightmare
      .evaluate( function ( done ) {
        var lines = document.querySelectorAll( '.chat-line__message, .chat-line__status' )

        if (!(lines && lines.length > 0)) return done( null, [] )

        function parse (text) {
          if ( text && text.textContent ) text = text.textContent
          return text && text
            .split(/[\r\n]/g)
            .map(function(str) { return str.trim() })
            .filter(function (str) {
              return str.trim().length !== 0
            })
            .join(' ')
            .trim() || text
        }

        var messages = []
        ;[].forEach.call(lines, function (line) {
          var system = undefined
          var from = undefined
          var text = undefined
          var html = undefined

          if ( line.className !== 'chat-line__status' ) {
            from = parse(
              line.querySelector( '.chat-line__username' )
            )

            text = parse(
              [].slice.call(
                line.querySelectorAll( ':scope > span' ), 2
              )
              .map( function ( el ) {
                switch ( el.getAttribute( 'data-a-target' ) ) {
                  case 'emote-name':
                    return el.querySelector( 'img' ).alt
                    break
                  default: return el.textContent
                }
              } )
              .join( '' )
            )

            html = (
              [].slice.call(
                line.querySelectorAll( ':scope > span' ), 2
              )
              .map( function ( el ) {
                return el.innerHTML
              } )
              .join( '' )
            )
          } else {
            system = line.textContent
            text = line.textContent

            if ( system.indexOf( 'Welcome to the chat room!' ) === 0 ) {
              from = 'jtv'
              html = line.innerHTML
              system = false
            }
          }

          // console.log( 'from: ' + parse( from.textContent ) )
          // console.log( 'text: ' + text )
          // console.log( 'html: ' + html )

          var moderator = undefined
          var subscriber = undefined
          var prime = undefined
          var cheer = undefined
          var turbo = undefined
          var staff = undefined
          var broadcaster = undefined

          var badges = line.querySelectorAll( '.chat-badge' )
          ;[].forEach.call(badges, function (item) {
            var itemText = (
              item.getAttribute( 'alt' ) || item.getAttribute( 'original-title' ) ||
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
          if ( text && from ) {
              messages.push({
                type: 'chat',
                from: from,
                text: text,
                html: html,
                moderator: moderator,
                subscriber: subscriber,
                prime: prime,
                cheer: cheer,
                turbo: turbo,
                staff: staff,
                broadcaster: broadcaster
              })
          } else if (text || system) { // system message
            messages.push({
              type: 'system',
              from: from || '',
              text: text || system
            })
          } else { // unknown message
            var deleted = line.querySelector('.deleted')
            if (deleted) {
              messages.push({
                type: 'deleted',
                from: from,
                text: deleted
              })
            } else {
              messages.push({
                type: 'unknown',
                from: from,
                text: text
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
        // console.log( ' == CALLING DONE == ' )
        done( null, messages )
      } )
      .then( function ( messages ) {
        // messages && console.log( 'messages length: ' + messages.length )

        callback( undefined, {
          type: 'tick',
          text: 'DOM polled'
        } )

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
          setTimeout(tick, _interval) // poll again in <interval || 1000> miliseconds
        } else {
          callback(undefined, {
            type: 'exit',
            text: 'exit'
          })
        }
      } )
    }
  } )

  function exit () {
    if (_running) {
      _running = false

      nightmares.forEach( function ( nm ) {
        try {
          nm.halt()
        } catch ( err ) { /* ignore */ }
      } )

      callback(undefined, {
        type: 'exit',
        text: 'exit'
      })
    }
  }

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
