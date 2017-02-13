/* This is a phantomjs script and needs to be run with the phantomjs binary */

var page = require('webpage').create()
page.viewportSize = { width: 1, height: 1 }

var _timeout = setTimeout(function () {
  phantom.exit(1)
}, 10000)

var url = 'https://www.twitch.tv/directory/all'

page.reload()

page.open(url, function (status) {
  clearTimeout(_timeout)
  if (status !== 'success') {
    phantom.exit(1)
  } else {
    var body = page.evaluate(function () { return document.innerHTML })

    var channels = page.evaluate(function () {
      var dict = {}
      var anchors = document.querySelectorAll('#directory-list .content .thumb a')
      for (var i = 0; i < anchors.length; i++) {
        try {
          var a = anchors[i]
          if (a && a.href) dict[a.href] = decodeURI(a.href)
        } catch (err) {}
      }
      return Object.keys(dict).map(function (key) { return dict[key] })
    })

    if (channels) {
      channels = channels.map(function (channel) {
        while (channel[channel.length - 1] === '/') {
          channel = channel.substr(0, channel.length - 1)
        }
        channel = channel.split('/').reverse()[0]
        return channel
      })
      console.log(JSON.stringify(channels))
      phantom.exit(0)
    } else {
      phantom.exit(1)
    }
  }
})
