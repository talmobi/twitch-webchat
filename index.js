const fs = require('fs')
const puppeteer = require( 'puppeteer' )
const nozombie = require( 'nozombie' )
const miniget = require('miniget')
const rimraf = require('rimraf')

// ref: https://stackoverflow.com/a/41854075/3496140
function nameFunction(name, body) {
  return {[name](...args) {return body(...args)}}[name]
}

// 91067577
// 762607118


const BTTV_EMOTE_URL = 'https://cdn.betterttv.net/emote/$emoteId/1x'
const EMOTE_URLS = {
  'globalffz': 'https://api.frankerfacez.com/v1/set/global',
  'globalbttv': 'https://api.betterttv.net/3/cached/emotes/global',
  'global7tv': 'https://api.7tv.app/v2/emotes/global',
  // 'ffz': 'https://api.frankerfacez.com/v1/room/id/:userId',
  // 'bttv': 'https://api.betterttv.net/3/users/twitch/:userId',
  // '7tv': 'https://api.7tv.app/v2/users/:userId/emotes',
}
const CACHED_EMOTES = {}

async function loadFfzEmotes () {
  const url = EMOTE_URLS.globalffz

  try {
    const body = await miniget(url).text()
    // console.log(body)
    const json = JSON.parse(body)
    for (set of Object.values(json.sets)) {
      for (e of set.emoticons) {
        const name = e.name
        const url = e.urls[1]
        CACHED_EMOTES[name] = url
      }
    }
  } catch (err ) {
    console.log(err)
  }
}

async function loadBttvEmotes () {
  const url = EMOTE_URLS.globalbttv

  try {
    const body = await miniget(url).text()
    // console.log(body)
    const json = JSON.parse(body)
    const emotes = json
    for (let i = 0; i < emotes.length; i++) {
      const e = emotes[i]
      const name = e.code
      const url = BTTV_EMOTE_URL.replace('$emoteId', e.id)
      CACHED_EMOTES[name] = url
    }
  } catch (err ) {
    console.log(err)
  }
}

async function load7tvEmotes () {
  const url = EMOTE_URLS.global7tv

  try {
    const body = await miniget(url).text()
    // console.log(body)
    const json = JSON.parse(body)
    const emotes = json
    for (let i = 0; i < emotes.length; i++) {
      const e = emotes[i]
      const name = e.name
      const url = e.urls[0][1]
      CACHED_EMOTES[name] = url
    }
  } catch (err ) {
    console.log(err)
  }
}

// helper function to turn long-running task with callback
// to collect callback listeners and respond in bulk and only run one-at-a-time
function callbackCollectify ( fn ) {
  let _callbacks = []
  let _inProgress = false

  const _api = function callbackCollectifyApi ( callback ) {
    _callbacks.push( callback )

    if ( !_inProgress ) {
      _inProgress = true
      _start()
    }
  }

  function _start () {
    process.nextTick( function () {
      fn( function done ( ...args ) {
        _callbacks.forEach( function ( callback ) {
          callback.apply( this, args )
        } )

        _callbacks = []
        _inProgress = false
      } )
    } )
  }

  return nameFunction( fn.name, _api )
}

function getTopStreamers ( callback ) {
  getTopStreamersFull( function ( err, list ) {
    if ( err ) return callback( err )

    try {
      const names = list.map( function ( item ) {
        // return item.name + ' : ' + item.liveCount
        return item.name
      } )

      callback( null, names )
    } catch ( err ) {
      callback( err )
    }
  } )
} // eof getTopStreamers fn

function getTopStreamersFull ( callback ) {
  const nz = nozombie()

  const opts = {
    // pipe: true,
    headless: "new",
    // slowMo: 250, // slow down to more easily see what's going on
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  }

  const _timeout = setTimeout( function () {
    // negate finish callback so it's not called after the
    // timeout has been triggered
    finish = function () {}
    nz.kill()

    callback( 'timed out' )
  }, 1000 * 45 )

  function finish ( ...args ) {
    clearTimeout( _timeout )
    nz.kill()
    callback.apply( this, args )
  }

  ;( async function () {
    try {
      const browser = await puppeteer.launch( opts )

      const child = browser.process()
      const pid = child.pid
      nz.add( { pid: pid, ttl: 1000 * 60 } )

      const pages = await browser.pages()
      const page = pages[ 0 ]

      await page.goto( 'https://www.twitch.tv/directory/all?sort=VIEWER_COUNT')

      await page.waitForSelector( 'article' )
      await page.waitForSelector( '.side-nav-card' )
      await page.waitForSelector( '.side-nav-card__live-status' )
      await page.waitForSelector( '.tw-media-card-stat' )

      // .tw-media-card-stat > span
      // .tw-media-card-meta__links

      // console.log( ' >>> GIRAFFE <<< ' )

      const list = await page.evaluate( function () {
        var streamCards = document.querySelectorAll( 'div[data-target="directory-game__card_container"]' )

        var lock = {}
        var list = []

        ;[].forEach.call(
          streamCards,
          function ( el ) {
            el.style.background = 'cyan'

            var avatar = el.querySelector( '.tw-avatar img' )
            if ( !avatar ) return

            if ( avatar.src.indexOf( 'user-default' ) > 0 ) {
              // top streamers with a default user avatar are probably
              // created by bots as illegal streams.
              console.log( 'skipping channel with user-default avatar (probably illegal stream)' )
              return
            }

            el.style.background = 'blue'

            var liveCountLabel = el.querySelector( '.tw-media-card-stat' ).innerText

            // match view count labels as numbers
            const m = liveCountLabel.match( /(\d+(\.\d+)?)K?M?/ )
            var liveCount = Number( m[ 1 ] )

            // thousands
            if ( m[ 0 ].indexOf( 'K' ) > 0 ) liveCount *= 1000

            // millions
            if ( m[ 0 ].indexOf( 'M' ) > 0 ) liveCount *= 1000 * 1000

            el.style.background = 'purple'

            var link = el.querySelector( 'a.tw-link' )
            var href = link.href
            var name = href.split( '/' ).pop()

            if ( !name ) return

            if ( lock[ name ] ) return
            lock[ name ] = name

            el.style.background = 'yellow'

            list.push( {
              name: name,
              href: link.href,
              avatar: avatar.src,
              liveCount: liveCount
            } )
          }
        )

        list.sort( function ( a, b ) {
          return b.liveCount - a.liveCount
        } )

        return list
      } )

      // console.log( ' >>> list.length: ' + list.length )

      await browser.close()

      // console.log( list )

      finish( null, list )
    } catch ( err ) {
      /* ignore */
      finish( err )
    }
  } )()
} // eof getTopStreamersFull fn

function start (opts, callback) {
  start.nozombie = start.nozombie || nozombie()
  const nz = nozombie()

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
  const tmpDirPaths = []

  nz.kill()
  next()
  function next () {
    ;( async function () {
      try {
        const opts = {
          pipe: true,
          headless: "new",
          // headless: false,
          // slowMo: 250 // slow down to more easily see what's going on
        }

        browser = await puppeteer.launch( opts )

        const child = browser.process()
        const pid = child.pid
        nz.add( pid )

        const spawnargs = browser.process().spawnargs
        const tmpDirPath = spawnargs.find(
          function (el) { return el.indexOf('--user-data-dir=') === 0 }
        ).split('=')[1]
        tmpDirPaths.push(tmpDirPath)

        _channels.forEach( async function ( channel ) {
          try {
            await loadFfzEmotes()
            await loadBttvEmotes()
            // await load7tvEmotes()

            // console.log('cached emotes:')
            // console.log(
            //   JSON.stringify(CACHED_EMOTES, null, 2)
            // )
          } catch (err) {
            console.log(err)
          }

          try {
            const url = URL_TEMPLATE.replace('$channel', channel)

            const page = await browser.newPage()

            await page.goto( url, {
              waitUntil: 'domcontentloaded'
            } )
            await page.waitForFunction( function () {
              const el = document.querySelector( 'div[data-a-target="chat-welcome-message"].chat-line__status' )
              return !!el
            }, { polling: 250 } )

            // prevent page redirections due to channel raids etc
            await page.setRequestInterception(true)
            page.on('request', function (request) {
              if (request.isNavigationRequest()) {
                request.abort();
              } else {
                request.continue();
              }
            })

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
                  var lines = document.querySelectorAll( '.chat-line__message, .chat-line__status, div[data-a-target="chat-line-message"]' )

                  // filter out already processed lines
                  lines = [].filter.call( lines, el => !el._twitchwebchat_has_processed )

                  if (!(lines && lines.length > 0)) return []

                  function parseText (text) {
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

                  function _parseSubscriberMessage ( text ) {
                    // text sample: 68-Month Subscriber (Tier 3, 5-Year Badge)
                    const s = {
                      alt: text
                    }

                    s.toString = function () {
                      return text
                    }

                    try {
                      s.months = Number( /(\d+).?month/i.exec( text )[ 1 ] )
                    } catch ( err ) { /*ignore*/ }

                    try {
                      s.tier = Number( /tier.?(\d+)/i.exec( text )[ 1 ] )
                    } catch ( err ) { /*ignore*/ }

                    try {
                      s.badge = Number( /(\d+).?year/i.exec( text )[ 1 ] )
                    } catch ( err ) { /*ignore*/ }

                    return s
                  }

                  var messages = []
                  ;[].forEach.call(lines, function (line) {
                    var system = undefined
                    var from = undefined
                    var text = undefined
                    var html = undefined

                    if ( !line.classList.contains('chat-line__status') ) {
                      from = parseText(
                        line.querySelector( '.chat-line__username' )
                      )

                      function getSeparator (lineEl) {
                        var found
                        var span, spans = [].slice.call( lineEl.querySelectorAll('span') )
                        for (var i = 0; i < spans.length; i++) {
                          var span = spans[i]
                          var text = span.textContent
                          if (text.trim() === ':') {
                            found = span
                            break
                          }
                        }
                        return found
                      }

                      text = parseText(
                        [].slice.call(
                          line.querySelectorAll( 'span[data-a-target="chat-message-text"], div[data-test-selector="emote-button"]' )
                        )
                        .filter( function ( el ) {
                          // filter nonsense
                          return el.textContent || el.querySelector('img')
                        } )
                        .map( function ( el ) {
                          el = el.querySelector('[data-a-target]') || el
                          var imgEl = el.querySelector('img')
                          if (imgEl) {
                            return imgEl.alt
                          }

                          return el.textContent
                        } )
                        .join( '' )
                      )

                      html = (
                        [].slice.call(
                          line.querySelectorAll( 'span[data-a-target="chat-message-text"], div[data-test-selector="emote-button"]' )
                        )
                        .filter( function ( el ) {
                          // filter nonsense
                          return el.textContent || el.querySelector('img')
                        } )
                        .map( function ( el ) {
                          el = el.querySelector('[data-a-target]') || el
                          var imgEl = el.querySelector('img')
                          if (imgEl) {
                            return imgEl.outerHTML
                          }

                          return '<span>' + el.textContent + '</span>'
                          } )
                        .join( '' )
                      )
                    } else {
                      system = line.textContent
                      text = line.textContent
                      html = line.innerHTML
                    }

                    // console.log( 'from: ' + parseText( from.textContent ) )
                    // console.log( 'text: ' + text )
                    // console.log( 'html: ' + html )

                    var moderator = undefined
                    var subscriber = undefined
                    var prime = undefined
                    var cheer = undefined
                    var turbo = undefined
                    var staff = undefined
                    var broadcaster = undefined
                    var gifter = undefined

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
                        subscriber = _parseSubscriberMessage( itemText )
                      }

                      if (t.indexOf('prime') !== -1) {
                        prime = itemText
                      }

                      if (t.indexOf('gifter') !== -1) {
                        gifter = itemText
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
                          gifter: gifter,
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

                    // transform message html for popular emotes
                    if (message.html) {
                      message.html = message.html
                        .split(/\s+/)
                        .map(function(word) {
                          if (CACHED_EMOTES[word]) {
                            return `<img alt=${word} src=${CACHED_EMOTES[word]} />`
                          }
                          return word
                        })
                        .join( ' ' )
                    }


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
  }

  async function exit () {
    _running = false
    nz.kill()

    tmpDirPaths.forEach(function (p) {
      rimraf.sync(p)
      console.error('removed tmp dir path: ' + p)
    })

    if ( !_exitCalled ) {
      _exitCalled = true

      _callback(undefined, {
        type: 'exit',
        text: 'exit'
      })
    }

    try {
      await browser.close()
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
  getTopStreamers: callbackCollectify( getTopStreamers )
}
