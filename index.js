/*
 * Hello! Run with phantomjs! (npm start)
 *
 * About:
 *  Connects to twitch chat through phantomjs and polls for
 *  updates to the chat. Alternatively you could get a twitch oauth
 *  token and login in through IRC. This way doesn't require a login
 *  but is probably a lot slower and unreliable.
 *
 */

var system = require('system');
var page = require('webpage').create();
var $ = require('jquery');

page.viewportSize = { width: 1, height: 1 };

var address_template = "https://www.twitch.tv/<channel>/chat?popout";
var channel = system.env.channel;
var interval = system.env.interval || 1000; // polling interval
if (!channel) throw new Error("No channel name specified. Specifiy one in ENV.channel");

var address = address_template.replace('<channel>', channel);

function print (o) {
  if (typeof o === 'object') {
    o.channel = channel;
    console.log(JSON.stringify( o ).trim());
  }
};

print({
  type: "status",
  message: "starting",
  interval: interval
});

page.open(address, function (status) {
  print({
    type: "status",
    message: "page opened"
  });

  print({
    type: "connection",
    success: status === 'success',
    message: "connection: " + status,
    address: address
  });

  if (status !== 'success') {
     throw new Error("Failed to open channel.");
  }

  // start polling the DOM for changes
  var ticker = function () {
    //console.print("interval tick");

    var data = page.evaluate(function () {
      //var messages = $(".chat-messages .tse-content div .message")
      var messages = $(".chat-messages .tse-content div .chat-line")
                     .slice(0);

      var data = [];
      // grab the status we want
      messages.each(function (index) {
        var t = $(this);
        var from = t.find(".from").text();
        var html = t.find(".message").html();
        var text = t.find(".message").text();
        var emoticon = t.find(".emoticon").attr("alt");
        data.push({
          type: "chat message",
          html: html, // raw html

          from: from,
          text: text, // text only

          emoticon: emoticon,

            // plain text message overview
          message: from + ": " + text
        });
      });

      // remove the processed messages from the DOM
      messages.remove();

      // return the data back to our script context
      // (outside of page.evaluate)
      return data;
    });

    // spit out the data
    if (data && data.length > 0) {
      var bucket = {
        type: 'chat messages',
        messages: data
      };
      print( bucket );
    }

    setTimeout(ticker, interval);
  }
  setTimeout(ticker, interval);

});
