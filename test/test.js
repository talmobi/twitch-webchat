var tg = require('../spawn.js');

var channel = "teamsp00ky"

tg.start(function (err, data) {
  if (err) throw err;
  if (data && typeof data.forEach === 'function') {
    data.forEach(function(val, ind, arr) {
      console.log(val.from + ": " + val.text);
    });
  }
});
