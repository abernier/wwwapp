var conf = require('../conf');

var redis = require('redis');
var url = require('url');
console.log('redis clienting...');

var client = redis.createClient(url.format(conf.redis_uri));
function log(type) {
  return function() {
    console.log(type, arguments);
  }
}
client.on('connect'     , log('redis connect'));
client.on('ready'       , log('redis ready'));
client.on('reconnecting', log('redis reconnecting'));
client.on('error'       , log('redis error'));
client.on('end'         , log('redis end'));

// Middleware that check redis is ready
var isReady = (function (red) {
  var ready = false;

  red.on('ready', function () {ready = true;})
  red.on('end',   function () {ready = false;})

  var er = new Error('Redis is not ready.')

  return function (req, res, next) {
    if (ready) {
      next();
    } else {
      next(er);
    }
  }
}(client));

module.exports = {
	client: client,
	isReady: isReady
}