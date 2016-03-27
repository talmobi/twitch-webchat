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

var address_template = "https://www.twitch.tv/<channel>/chat?popout";
var channel = system.env.channel;
if (!channel) throw new Error("No channel name specified. Specifiy one in ENV.channel");

var address = address_template.replace('<channel>', channel);
console.log(JSON.stringify({
  type: "info",
  message: "starting",
}));

page.open(address, function (status) {
  console.log(JSON.stringify({
    type: "info",
    message: "page opened"
  }));

  if (status !== 'success') {
     throw new Error("Failed to open channel.");
  }
  console.log(JSON.stringify({
    type: "connection",
    success: status === 'success',
    message: "connected: " + status,
    address: address
  }));

  // start polling the DOM for changes
  setInterval(function () {
    //console.log("interval tick");

    var data = page.evaluate(function () {
      //var messages = $(".chat-messages .tse-content div .message")
      var messages = $(".chat-messages .tse-content div .chat-line")
                     .slice(0);

      var data = [];
      // grab the info we want
      messages.each(function (index) {
        var t= $(this);
        var from = t.find(".from").text();
        var html = t.find(".message").html();
        var text = t.find(".message").text();
        var emoticon = t.find(".emoticon").attr("alt");
        data.push({
          type: "chat message",
          from: from,
          html: html,
          text: text,
          emoticon: emoticon
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
      console.log( JSON.stringify(data) );
    }

  }, 1000);
});
