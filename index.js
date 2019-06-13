const puppeteer = require( 'puppeteer' )
const treeKill = require( 'tree-kill' )

function getTopStreamers ( callback ) {
  const opts = {
    pipe: true
    // headless: false,
    // slowMo: 250 // slow down to more easily see what's going on
  }

  const _callback = callback
  let browser

  callback = function ( ...args ) {
    try {
      const child = browser.process()
      const pid = child.pid
      treeKill( pid )
    } catch ( err ) { /* ignore */ }

    _callback.apply( this, args )
  }

  const _timeout = setTimeout( function () {
    const cb = callback

    // neutralize callback so it's not called after the
    // timeout has been triggered
    callback = function () {}

    cb( 'timed out' )
  }, 1000 * 30 )

  ;( async function () {
    try {
      browser = await puppeteer.launch( opts )
      const page = await browser.newPage()

      await page.goto( 'https://www.twitch.tv/directory/all')
      await page.waitFor( '.tw-link.tw-link--inherit' )

      const list = await page.evaluate( function () {
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
          } catch (err) { /* ignore */ }
        }

        // return result to callback funciton [1]
        var list = Object.keys(dict).map(function (key) {
          return dict[key].split( '/' )[ 3 ]
        })

        console.log( 'returning' )
        return list
      } )

      const child = browser.process()
      const pid = child.pid

      await browser.close()

      treeKill( pid )

      clearTimeout( _timeout )
      callback( null, list )
    } catch ( err ) {
      /* ignore */
      callback( err )
    }
  } )()
} // eof getTopStreamers fn

function start (opts, callback) {
  var
    _channels = opts,
    _interval = 1000,
    _running = true,
    _exitCalled = false

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

  const _callback = callback

  // var URL_TEMPLATE = "https://www.twitch.tv/$channel/chat?popout"
  const URL_TEMPLATE = "https://www.twitch.tv/popout/$channel/chat"
  let browser

  ;( async function () {
    try {
      const opts = {
        pipe: true
        // headless: false,
        // slowMo: 250 // slow down to more easily see what's going on
      }

      browser = await puppeteer.launch( opts )

      _channels.forEach( async function ( channel ) {
        try {
          const url = URL_TEMPLATE.replace('$channel', channel)

          const page = await browser.newPage()

          await page.goto( url, {
            waitUntil: 'domcontentloaded'
          } )
          await page.waitFor( function () {
            const el = document.querySelector( 'div[data-a-target="chat-welcome-message"].chat-line__status' )
            return !!el
          }, { polling: 250 } )

          tick()

          async function tick () {
            // console.log( ' == CALLING TICK == ' )
            callback = function ( err, evt ) {
              if ( !_exitCalled ) {
                _callback( err, evt )
              }
            }

            try {
              const messages = await page.evaluate( function () {
                var lines = document.querySelectorAll( '.chat-line__message, .chat-line__status' )

                // filter out already processed lines
                lines = [].filter.call( lines, el => !el._twitchwebchat_has_processed )

                if (!(lines && lines.length > 0)) return []

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
                  // Mark the element as processed by attaching an
                  // internal id: '_twitchwebchat_has_processed'
                  // We have to keep the element in the DOM because javascript
                  // on the page will sometimes attempt to remove the element
                  // (spam removal, deletes by moderators etc) -> and if the
                  // element has already been removed (by us right here) then
                  // the pages javascript will fail and the page will crash and
                  // we will not be getting any new messages.
                  // When the messages start piling up the pages javascript
                  // will remove older messages so we won't have to worry about
                  // memory or size issues.
                  line._twitchwebchat_has_processed = Date.now()
                  line.style.background = 'red'
                })

                // return the data back to our script context
                // (outside of evaluate)
                return messages
              } )

              callback( undefined, {
                type: 'tick',
                text: 'DOM polled'
              } )

              if (messages && messages instanceof Array) {
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

              if ( _running ) {
                setTimeout(tick, _interval) // poll again in <interval || 1000> miliseconds
              } else {
                exit()
              }
            } catch ( err ) {
              /* ignore */
              if ( !_exitCalled ) callback( err )
            }
          }
        } catch ( err ) {
          /* ignore */
          if ( !_exitCalled ) callback( err )
        }
      } )
    } catch ( err ) {
      /* ignore */
      if ( !_exitCalled ) callback( err )
    }
  } )()

  function exit () {
    _running = false

    if ( !_exitCalled ) {
      _exitCalled = true

      _callback(undefined, {
        type: 'exit',
        text: 'exit'
      })
    }

    try {
      const child = browser.process()
      const pid = child.pid

      browser.close()

      treeKill( pid )
    } catch ( err ) { /* ignore */ }
  }

  // return api to exit
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
