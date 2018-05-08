var conf = require('../../conf')
//console.log('conf=', conf)

var tap = require('tap');
var request = require('request');
var _ = require ('underscore');

var App = require('../../server/app');

var app;
// tap.beforeEach(function (done) {
//   console.log('beforeEach')

// 	app = App();

// 	app.start(function (er) {
// 		if (er) return done(er);

// 		done()
// 	})
// })
// tap.afterEach(function (done) {
//   console.log('afterEach')

// 	app.stop(function (er) {
//     console.log('app.stop callback')
// 		if (er) return done(er);

// 		app = undefined;
// 		done()
// 	})
// })

var app = App();
tap.test('setup', function (t) {
  app.start(function (er) {
    if (er) return t.threw(er);

    t.end()
  })  
})

//

function uri(pathname) {
  var url = require('url');

  var uriA = url.parse(url.format(conf.www_host));
  var uriB = url.parse(url.format(pathname));

  uriA.pathname = uriB.pathname;
  uriA.path     = uriB.path;
  uriA.search   = uriB.search;
  uriA.query    = uriB.query;
  uriA.hash     = uriB.hash;
  uriA.auth     = uriB.auth;

  return url.format(uriA);
}

function reqq(options, cb) {  
  return request(options, function (er, resp, data) {
    // Normalize error
    if (er || resp && resp.statusCode >= 400 || data && data.error) {
      er || (er = new Error(data && data.message || resp && resp.statusMessage));
      er.status || (er.status = data && data.status || resp && resp.statusCode);
      er.error || (er.error = data && data.error);
      er.stack || (er.stack = data && data.stack);
    }
    
    cb(er, resp, data);
  });
}

tap.test('JSON by default', function (t) {
  t.plan(5);

  app.get('/app-default-content-type', function (req, res, next) {
    console.log('/app-default-content-type');

    t.ok(req.headers['accept'] === 'application/json', 'Accept header defaults to "application/json"')
    t.ok(req.headers['content-type'] === 'application/json', 'Content-Type header defaults to "application/json"')

    t.ok(req.body.test === "json content", 'req.body is thus interpreted as json')

    res.status(204).end()
  });

  reqq({
    method: 'GET',
    uri: uri('/app-default-content-type'),
    body: '{"test": "json content"}'
  }, function (er, resp, data) {
    t.error(er, 'response should not be an error', er)
    
    t.ok(204 === resp.statusCode, '/app-default-content-type returns a 204');

    t.end()
  });
});

tap.test('session', function (t) {
  t.plan(9)

  app.get('/app-req1', function (req, res, next) {
    console.log('/app-req1');

    t.ok('session' in req, 'session exists');

    // set a value into session
    req.session.mysetting = 'foo';

    res.status(204).end();
  });

  app.get('/app-req2', function (req, res, next) {
    console.log('/app-req2');

    t.ok(req.session.mysetting === 'foo', 'value can be retrieve from session in subsequent request');

    res.status(204).end();
  });

  app.get('/app-req3', function (req, res, next) {
    console.log('/app-req3');

    t.ok(typeof req.session.mysetting === 'undefined', 'clearing cookies jar has reset a new session');

    res.status(204).end();
  });

  var jar = request.jar();

  //
  // req1
  //

  reqq({
    method: 'GET',
    uri: uri('/app-req1'),
    jar: jar
  }, function (er, resp, data) {
    t.error(er, 'response should not be an error', er)
    
    t.ok(204 === resp.statusCode, '/app-req1 returns an expected 204');

    thenReq1()
  });

  //
  // req2
  //

  function thenReq1() {
    reqq({
      method: 'GET',
      uri: uri('/app-req2'),
      jar: jar
    }, function (er, resp, data) {
      t.error(er, 'response should not be an error', er)
      
      t.ok(204 === resp.statusCode, '/app-req2 returns an expected 204');

      thenReq2()
    });
  }

  //
  // req3
  //

  function thenReq2() {
    jar = request.jar(); // clear jar

    reqq({
      method: 'GET',
      uri: uri('/app-req3'),
      jar: jar
    }, function (er, resp, data) {
      t.error(er, 'response should not be an error', er)
      
      t.ok(204 === resp.statusCode, '/app-req3 returns an expected 204');
    });
  }
  
});

tap.test('body/flash messages and body values', function (t) {
  t.plan(10);

  app.get('/app-messages1', function (req, res, next) {
    console.log('/app-messages1');

    //
    // flash and body messages
    // 
    //   - flash messages are used to display snackbar messages
    //   - body messages are used to display client validation errors
    //

    t.ok('flash' in req.session.messages && _.isArray(req.session.messages.flash) && req.session.messages.flash.length === 0, 'req.session.messages.flash is an empty array')
    t.ok('body' in req.session.messages && _.isObject(req.session.messages.body) && JSON.stringify(req.session.messages.body) === '{}', 'req.session.messages.body is an empty object')

    // set some values into session
    req.session.messages.flash.push({type: 'error', message: 'Wrong credentials'})
    req.session.messages.body.email = {field: 'email', code: 'invalid', message: 'Please enter a valid email'}

    //
    // req.session.body 
    //
    // used to persist req.body values
    //

    t.ok('body' in req.session && _.isObject(req.session.body) && JSON.stringify(req.session.body) === '{}', 'req.session.body is an empty object')

    // set a value into session
    req.session.body.email = 'invalidemail.com';

    res.redirect('/app-messages2')
  });
  app.get('/app-messages2', function (req, res, next) {
    console.log('/app-messages2');

    t.ok(
      res.locals._settings.messages.flash.length === 1
      && res.locals._settings.messages.flash[0].type === 'error'
      && res.locals._settings.messages.flash[0].message === 'Wrong credentials'
    , 'flash messages have been passed to the view');
    t.ok(req.session.messages.flash.length === 0, 'previous flash messages have been flush from session');

    t.ok(
      Object.keys(res.locals._settings.messages.body).length === 1
      && 'email' in res.locals._settings.messages.body
      && res.locals._settings.messages.body.email.field === 'email'
      && res.locals._settings.messages.body.email.code === 'invalid'
      && res.locals._settings.messages.body.email.message === 'Please enter a valid email'
    , 'body messages have been passed to the view');
    t.ok(Object.keys(req.session.messages.body).length === 0, 'previous body messages have been flush from session');

    t.ok(
      Object.keys(res.locals._settings.body).length === 1
      && 'email' in res.locals._settings.body
      && res.locals._settings.body.email === 'invalidemail.com'
    , 'body values have been passed to the view');
    t.ok(Object.keys(req.session.body).length === 0, 'previous body values have been flush from session');

    res.status(422).end();
  });

  var jar = request.jar();

  request({
    method: 'GET',
    uri: uri('/app-messages1'),
    jar: jar
  }, function (er, resp, data) {
    t.ok(422 === resp.statusCode, '/app-messages1 returns an expected 422');

    t.end()
  });
});

tap.test('req.uest', function (t) {
  t.test('cookies', function (t) {
    t.plan(8)

    var jar = request.jar();
    var cookie1 = request.cookie('totocook1=toto1');
    var cookie2 = request.cookie('totocook2=toto2');
    jar.setCookie(cookie1, require('url').format(conf.www_host));
    jar.setCookie(cookie2, require('url').format(conf.www_host));

    app.get('/app-toto', function (req, res, next) {
      console.log('/app-toto');

      // subrequest /app-tata
      req.uest({
        method: 'POST',
        uri: uri('/app-tata')
      }, function (er, resp, data) {
        t.error(er, '/app-tata should not return any error', er);

        t.ok(201 === resp.statusCode, '/app-tata returns a 201');
        t.ok(JSON.toString({yes: 'oktata'}) === JSON.toString(data), '/app-tata returns expected json value');

        var cookiesStr = res.get('set-cookie').toString();

        t.ok((
          (cookiesStr.indexOf('tatacook1') !== -1)
          &&
          (cookiesStr.indexOf('tatacook2') !== -1)
        ), 'Cookies set in the subsequent request /app-tata should have been passed to res');

        res.status(200).send('oktoto')
      });
    })
    app.post('/app-tata', function (req, res, next) {
      var cookiesStr = req.get('cookie').toString(); // "totocook1=toto1; totocook2=toto2"

      t.ok((
        (cookiesStr.indexOf('totocook1=toto1') !== -1)
        &&
        (cookiesStr.indexOf('totocook2=toto2') !== -1)
      ), 'Cookies initially present in /app-toto should have been passed')

      res.cookie('tatacook1', 'tata1')
      res.cookie('tatacook2', 'tata2')

      res.status(201).json({yes: 'oktata'})
    })

    reqq({
      method: 'GET',
      uri: uri('/app-toto'),
      jar: jar
    }, function (er, resp, data) {
      t.error(er, 'response should not be an error', er)
      
      t.ok(200 === resp.statusCode, '/app-toto returns a 200');
      t.ok('oktoto' === data, '/app-toto returns the expected value');

      t.end()
    });
  });
  
  t.test('messages', function (t) {
    t.end();
  });

  t.end();
});

tap.test('?next=', function (t) {
  t.test('next-url', function (t) {
    app.get('/app-next-url1', function (req, res, next) {
      console.log('/app-next-url1');

      res.redirect('/shouldnotgothere');
    });
    app.get('/app-next-url2', function (req, res, next) {
      console.log('/app-next-url2');

      res.status(200).end('next-url2!')
    });

    reqq({
      method: 'GET',
      uri: uri('/app-next-url1?next=/app-next-url2')
    }, function (er, resp, data) {
      t.error(er, 'response should not be an error', er)
      
      t.ok(200 === resp.statusCode, '/app-next-url2 returns a 200');
      t.ok('next-url2!' === data, '/app-next-url2 returns the expected value');

      t.end()
    });
  });

  t.test('next-status', function (t) {
    app.get('/app-next-status1', function (req, res, next) {
      console.log('/app-next-status1');

      res.redirect(301, '/shouldnotgothere');
    });

    reqq({
      method: 'GET',
      uri: uri('/app-next-status1?next=/toto'),
      followRedirect: false
    }, function (er, resp, data) {
      t.error(er, 'response should not be an error', er)
      
      t.ok(301 === resp.statusCode, '/app-next-status1 returns a custom status code');
      t.ok('/toto' === resp.headers.location, 'redirect Location is ok');

      t.end()
    });
  });

  //
  // TODO: test `options` 3rd params
  //
  
  t.end();
});

// see: https://www.npmjs.com/package/method-override
tap.test('method override', function (t) {
  t.test('post', function (t) {
    app.post('/app-override', function (req, res, next) {
      res.status(204).end();
    });

    reqq({
      method: 'GET',
      uri: uri('/app-override?_method=POST')
    }, function (er, resp, data) {
      t.error(er, 'response should not be an error', er)
      
      t.ok(204 === resp.statusCode, 'Expected response code');

      t.end()
    });
  });
  
  t.test('put', function (t) {
    app.put('/app-override', function (req, res, next) {
      res.status(204).end();
    });

    reqq({
      method: 'GET',
      uri: uri('/app-override?_method=PUT')
    }, function (er, resp, data) {
      t.error(er, 'response should not be an error', er)
      
      t.ok(204 === resp.statusCode, 'Expected response code');

      t.end()
    });
  });

  t.test('delete', function (t) {
    app.delete('/app-override', function (req, res, next) {
      res.status(204).end();
    });

    reqq({
      method: 'GET',
      uri: uri('/app-override?_method=DELETE')
    }, function (er, resp, data) {
      t.error(er, 'response should not be an error', er)
      
      t.ok(204 === resp.statusCode, 'Expected response code');

      t.end()
    });
  });

  t.test('post', function (t) {
    app.patch('/app-override', function (req, res, next) {
      res.status(204).end();
    });

    reqq({
      method: 'GET',
      uri: uri('/app-override?_method=PATCH')
    }, function (er, resp, data) {
      t.error(er, 'response should not be an error', er)
      
      t.ok(204 === resp.statusCode, 'Expected response code');

      t.end()
    });
  });

  t.end();
});

tap.test('error', function (t) {
  reqq({
    method: 'GET',
    uri: uri('/foobarbaz')
  }, function (er, resp, data) {
    t.ok(er.status === 404, 'expected HTTP code');

    t.ok(er.message === 'Not Found', 'error should provide a message')

    t.ok('stack' in er, 'error should provide a stack')

    t.end()
  });
});

/*
TODO tests:

- content negociation
- serving md5 hard-cache burster
- public/ expires headers
*/

// 

tap.test('teardown', function (t) {
  app.stop(function (er) {
    console.log('app.stop callback')
    if (er) return t.threw(er);

    t.end()
    tap.end()
  })
})