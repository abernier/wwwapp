var _ = require('lodash');
var qs = require('qs');

module.exports = function (req, res, next) {
  //console.log('next middleware');

  var n = req.query.next;
  
  var oldRedirect = res.redirect;

  // arguments: [status], url, [options]
  res.redirect = function () {
    console.log('res.redirect', arguments);
    
    var status;
    var url;
    var options;

    if (arguments.length > 2) {
      // 3 args
      status = arguments[0];
      url = arguments[1];
      options = arguments[2];
    } else {
      // 2 args or less
      var lastarg = arguments[arguments.length-1];
      if (_.isObject(lastarg)) {
        // url, options
        status = undefined;
        url = arguments[0];
        options = lastarg;
      } else {
        // [status], url

        if (typeof arguments[0] === 'number') {
          // status, url
          status = arguments[0];
          url = arguments[1];
          options = undefined;
        } else {
          // url
          status = undefined;
          url = arguments[0];
          options = undefined;
        }
      }
    }
    console.log('redirect: url, status, options', url, status, options)

    _.defaults(options, {
      next: true,
      passnext: true
    });
    
    if (n) {
      if (options && options.next !== true) {
        //console.log('ignoring next!');

        // append ?next= param to the redirect url
        if (options.passnext !== false) {
          var u = require('url').parse(url);
          var query = qs.parse(u.search);
          query.next = n;
          u.search = qs.stringify(query)
          url = u.format();
        }
      } else {
        url = n;
        //console.log('monkey-patched redirect');
      }
    }

    var args;
    if (status) {
      args = [url, status];
    } else {
      args = [url];
    }
    //console.log('args', args);
    return oldRedirect.apply(res, args);
  };

  next();
}