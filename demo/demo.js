var tw = require('../twitch-webchat.js');

var api = tw.start('hireztv', function (err, data) {
  if (err) {
    api.kill();
    throw err;
  } else {
    switch (data.type) {
      case 'chat messages':
          var messages = data.messages;
          messages.forEach(function (val, ind, arr) {
            var message = val;
            /*
             * message.from - username
             * message.text - text only
             * message.message - message.from: message.text
             * message.html - raw html (emoticon img tags and all)
             *
             * */
            console.log(message.message);
          });
        break;
      case 'status':
          var message = data.message;
          console.log(message);
        break;
    };
  }
});

setTimeout(function () {
  console.log("timer expired - shutting down.");
  api.kill();
}, 20000);
