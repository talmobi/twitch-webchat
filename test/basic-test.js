var tw = require('../twitch-webchat.js');

var assert = require('assert');
var request = require('request');

var channel = "sodapoppin";
var url = "https://api.twitch.tv/kraken/streams/featured";
var topurl = "https://www.twitch.tv/directory/all";

describe('Consume featured twitch web chat', function () {
  this.timeout(20000);
  var channel = "sodapoppin";

  it('should get featured twitch channel', function (done) {
    request(url, function (err, res, body) {
      if (err) throw err;
      var json = JSON.parse(body);
      channel = json.featured[0].stream.channel.name;
      console.log("channel (featured): " + channel);
      done();
    });
  });

  var ee = (function () {
    var callbacks = [];
    return {
      sub: function (cb) {
        callbacks.push( cb );
        return function () {
          callbacks.splice(cb, 1);
        }
      },
      trigger: function () {
        //console.log(messages);
        callbacks.forEach(function (val) {
          val();
        });
      }
    }
  })();
  var buffer = [];
  var api = null;
  it('should start twitch-webchat', function (done) {
    api = tw.start({channel: channel, interval: 1111}, function (err, data) {
      if (err) {
          throw err;
      };

      if (data && typeof data === 'object') {
        buffer.push(data);
        ee.trigger();

        if (data.type == 'connection') {
          if (data.success) {
            done();
          } else {
            done(new Error("page open failed."));
          }
        }
      }
    });
  });

  it('receive jtv welcome message', function (done) {
    this.timeout(5000);
    var unsub = ee.sub(function () {
      var f = buffer.filter(function (val) {
        return val.type == 'chat messages';
      });
      if (f && f.length > 0) {
        var msg = f[0].messages[0];
        console.log(msg.from + ": " + msg.text);
        assert.equal(msg.from, 'Jtv');
        assert.equal(msg.text, 'Welcome to the chat room!');
        unsub();
        done();
      }
    });
    ee.trigger();
  });

  it('should shutdown phantom spawn process successfully', function (done) {
    this.timeout(5000);
    assert.equal(typeof api, 'object')
    assert.equal(typeof api.kill, 'function')

    var checks = 0;

    api.kill();
    var unsub = ee.sub(function () {
      var f = buffer.filter(function (val) {
        return val.type == 'status';
      });
      if (f && f.length > 0) {
        var last_index = f.length - 1;
        var msg = f[ last_index ].message;
        console.log(msg);

        if (msg == 'kill requested') {
          checks++;
          delete f[last_index];
        }

        if (msg == 'closed') {
          checks++;
          delete f[last_index];
        }

        if (checks >= 2) {
          unsub();
          done();
        }
      }
    });
    ee.trigger();
  });

});

