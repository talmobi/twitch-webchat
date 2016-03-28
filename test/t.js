var ghost = require('../spawn.js');

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
  it('should start twitch-ghost', function (done) {
    api = ghost.start(channel, function (err, data) {
      if (err) {
          throw err;
      };

      if (data) {
        buffer.push(data);
        ee.trigger();

        if (data.type == 'connection' && data.success) {
          done();
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

  describe('Extra: read in user supplied messages (if any)', function () {

    it('receive a user message', function (done) {
      this.timeout(20000);
      var unsub = ee.sub(function () {
        var f = buffer.filter(function (val) {
          return val.type == 'chat messages';
        });
        if (f && f.length > 1) {
          var msg = f[1].messages[0];
          console.log(msg.from + ": " + msg.text);
          assert.ok(msg.from.length);
          assert.ok(msg.text.length);
          unsub();
          done();
        }
      });
      ee.trigger();
    });

    it('receive another user message', function (done) {
      this.timeout(20000);
      var unsub = ee.sub(function () {
        var f = buffer.filter(function (val) {
          return val.type == 'chat messages';
        });
        if (f && f.length > 2) {
          var msg = f[2].messages[0];
          console.log(msg.message);
          assert.ok(msg.message.length)
          unsub();
          done();
        }
      });
      ee.trigger();
    });

  });

  it('should shutdown phantom spawn process successfully', function (done) {
    apapi.kill();
    this.timeout(5000);
    var unsub = ee.sub(function () {
      var f = buffer.filter(function (val) {
        return val.type == 'status';
      });
      if (f && f.length > 1) {
        var last_index = f.length - 1;
        var msg = f[ last_index ].messages[ last_index ];
        console.log(msg.message);
        assert.equal(msg.message, 'closed')
        unsub();
        done();
      }
    });
    ee.trigger();
  });

});

