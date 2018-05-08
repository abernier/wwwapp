var _ = require('lodash');
var request = require('request');
var url = require('url');

module.exports = function (opts) {
  opts || (opts = {});
  _.defaults(opts, {
    host: 'http://localhost:3000',
    proxy: undefined,
    basicauth: {
      login: undefined,
      password: undefined
    }
  })

  return function (req, res, next) {
    //
    // A jar of cookies for subsequent requests
    //

    var jar = request.jar();

    // Initially filled with req cookies
    var cookies = req.headers && req.headers.cookie && req.headers.cookie.split(/\s*;\s*/);
    if (cookies && cookies.length) {
      cookies.forEach(function (cookieStr) {
        //console.log('putting cookie "%s" into jar', cookieStr);

        jar.setCookie(cookieStr, opts.host);
      });
    }
    //console.log('jar', require('util').inspect(jar));

    function uest(options, cb) {

      //
      // Defaults options
      //

      _.defaults(options, {
        json: true,
        jar: jar,
        headers: {
          "X-Requested-With": "req.uest"
        }
      });

      if (opts.proxy) {
        options.proxy = opts.proxy;
      }
      if (opts.basicauth.login) {
        options.auth = {
          user: opts.basicauth.login,
          pass: opts.basicauth.password
        };
      }

      if (options.method !== 'HEAD') {
        options.body = _.extend({}, req.params, req.body, req.query, options.body);
      }

      //
      // Make the request
      //

      //console.log('req.uest options', JSON.stringify(options, null, 4));
      request(options, function (er, resp, data) {
        // Normalize error
        if (er || resp && resp.statusCode >= 400 || data && data.error) {
          //console.log('uest cb', require('util').inspect(data));
          er || (er = new Error(data && data.message || resp && resp.statusMessage));
          er.status || (er.status = data && data.status || resp && resp.statusCode);
          er.error || (er.error = data && data.error);
          er.stack || (er.stack = data && data.stack);
        }

        //
        // Forward cookies set by subsequent req.uest to res (append)
        //

        resp && resp.headers && resp.headers['set-cookie'] && resp.headers['set-cookie'].forEach(function (cookie, index) {
          res.cookie(cookie);
        });

        if (req.session && req.session.id && req.session.reload) {
          //console.log('Reloading session of id %s', req.session.id);

          req.session.reload(function (err) {
            if (err) console.warn(err);

            //console.log('Session reloaded %s', req.session.id, JSON.stringify(req.session, null, 4));

            thenSessionReloaded();
          });
        } else {
          thenSessionReloaded();
        }

        function thenSessionReloaded() {
          cb(er, resp, data);
        }
        thenSessionReloaded = thenSessionReloaded.bind(this);

      });
    }

    // Decorate req
    req.uest = uest;

    next();
  };
};