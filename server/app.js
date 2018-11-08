module.exports = function () {

  const conf = require('../conf')
  console.log('conf', JSON.stringify(conf, null, 4));

  const exec = require('child_process').exec;

  var express = require('express');
  var app = express();

  var _ = require('underscore');
  var url = require('url')

  // var postgres = require('./postgres')
  var redis = require('./redis');

  var cons = require('consolidate');
  app.engine('dust', cons.dust);
  app.set('view engine', 'dust');
  app.set('views', __dirname + '/../views');
  //app.set('strict routing', true);

  require('dustjs-helpers');

  /*
  ##     ## #### ########  ########  ##       ######## ##      ##    ###    ########  ########
  ###   ###  ##  ##     ## ##     ## ##       ##       ##  ##  ##   ## ##   ##     ## ##
  #### ####  ##  ##     ## ##     ## ##       ##       ##  ##  ##  ##   ##  ##     ## ##
  ## ### ##  ##  ##     ## ##     ## ##       ######   ##  ##  ## ##     ## ########  ######
  ##     ##  ##  ##     ## ##     ## ##       ##       ##  ##  ## ######### ##   ##   ##
  ##     ##  ##  ##     ## ##     ## ##       ##       ##  ##  ## ##     ## ##    ##  ##
  ##     ## #### ########  ########  ######## ########  ###  ###  ##     ## ##     ## ########
  */

  function forcessl(req, res, next) {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, ['https://', req.get('Host'), req.url].join(''));
    }
    return next();
  };
  if (conf.forcessl === "true") {
    app.use(forcessl);
  }

  app.use(function(req, res, next) {
    res.locals._settings = {};

    next();
  });
  // Expose conf to req
  app.use(function(req, res, next) {
    req.conf = conf;
    res.locals._settings.conf = {
      www_host: require('url').format(conf.www_host),
      recaptcha_id: conf.recaptcha_id,
      facebook_client_id: conf.facebook_client_id,
      gtm: conf.gtm,
      lists: conf.lists
    };

    next();
  });
  
  // {headjs} locals
  app.use(function(req, res, next) {
    res.locals.headjs = require('fs').readFileSync(require('path').resolve(__dirname, `../public/head.js`), 'utf8')

    next();
  });

  // Default 'Accept' and 'Content-Type'
  app.use(function (req, res, next) {
    req.headers['accept'] = req.headers['accept'] || 'application/json';

    // if 'Accept: application/json' and 'Content-Type' is not set => defaults to 'application/json'
    if (req.headers['accept'] === 'application/json' && !req.headers['content-type']) {
      req.headers['content-type'] = req.headers['content-type'] || 'application/json';
    }

    next();
  });

  var bodyParser = require('body-parser')
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({extended: true}))

  //var multer = require('multer')
  //app.use(multer())

  // https://www.npmjs.com/package/method-override
  var methodOverride = require('method-override')
  app.use(methodOverride('_method', {methods: null}));

  // session
  var session = require('express-session')
  var RedisStore = require('connect-redis')(session)
  var sessionStore = new RedisStore({
    client: redis.client
  })
  app.use(session({
    store: sessionStore,
    secret: 'keyboard cat loves session',
    resave: false, // see: https://github.com/expressjs/session#resave,
    saveUninitialized: false
  }))

  var cors = require('cors');
  app.use(cors());

  if ('development' === app.get('env')) {
    app.set('view cache', false);
    //app.locals.pretty = true; // does not minify/compress html
  }

  //
  // {@url} options
  //

  var dust = require('dustjs-linkedin');
  require('../brover/dusthelpers');
  var fs = require('fs');
  var path = require('path');
  dust.helpers.url.md5 = ((`${conf.www_md5}` !== 'false') && fs.existsSync(path.resolve(__dirname, '../tmp/md5public.json')) && require('../tmp/md5public.json') || {});
  app.use(function (req, res, next) {
    var cdn = (conf[req.protocol === 'http' ? 'www_cdn' : 'www_cdns'] || '').trim();
    dust.helpers.url.hosts = cdn.split(' ').filter(function (el) {return el.length > 0;});
    dust.helpers.url.baseUrl = function () {return req.protocol + "://" + req.get('host') + req.url;};

    res.locals._settings.url = {
      md5: dust.helpers.url.md5,
      hosts: dust.helpers.url.hosts
    };

    next();
  });

  // flash messages: 'BREAKING NEWS'
  app.use(function (req, res, next) {
    var messages = {flash: [], body: {}};
    var body = {};

    // Expose messages to the views
    res.locals._settings.messages = req.session.messages || messages;
    res.locals._settings.body = req.session.body || body;

    // Then flush (create)
    //if (req.headers['X-Requested-With'] !== 'req.uest') {
      req.session.messages = messages;
      req.session.body = body;
    //}

    next();
  });

  // req.session.user
  app.use(function (req, res, next) {
    req.session.user || (req.session.user = {});

    next();
  })

  // Expose session to view
  app.use(function (req, res, next) {
    res.locals.session = req.session;

    next();
  });

  // Expose req.originalUrl
  app.use(function (req, res, next) {
    res.locals._settings.originalUrl = req.originalUrl;

    next();
  });

  app.use(function (req, res, next) {
    res.locals._settings.locale = 'fr';

    next();
  })

  // Pagination
  var pagination = require('./middleware/pagination')
  app.use(pagination);

  // req.uest wrapper middleware
  var uest = require('./middleware/uest')({
    host: require('url').format(conf.www_host),
    proxy: conf.www_proxy,
    basicauth: {
      login: conf.www_basicauth_login,
      password: conf.www_basicauth_password
    }
  })
  app.use(uest);

  //
  // Sequelize
  //

  var sequelize = require('./sequelize');
  app.sequelize = sequelize;

  var models = require('./models');
  app.use(function (req, res, next) {
    req.sequelize = sequelize;
    req.models = models;

    next();
  });

  // gzip
  var compression = require('compression')
  app.use(compression());
  // serve public directory: http://expressjs.com/en/resources/middleware/serve-static.html
  var staticMiddleware = express.static(__dirname + '/../public', {
    cacheControl: false,
    etag: false
  });
  app.use(staticMiddleware);

  //
  // logs
  //

  console.log('"env" is set to:', app.get('env'), process.env.NODE_ENV);
  // simple logger
  app.use(function(req, res, next) {
    if (req.url.indexOf('.css') === -1 && req.url.indexOf('.js') === -1  && req.url.indexOf('.png') === -1  && req.url.indexOf('.jpg') === -1 && req.url.indexOf('.ico') === -1) {
      //console.log('req.session=', req.session);
      //console.log('req.query=', req.query);
      console.log('%s %s', req.method, req.url);
    }
    next();
  });

  // ?next= redirect
  var next = require('./middleware/next')
  app.use(next);

  if (conf.www_basicauth_login) {
    var basicAuth = require('basic-auth-connect');
    app.use(basicAuth(conf.www_basicauth_login, conf.www_basicauth_password));  
  }

  //
  // Facebook and Google+ and Twitter preview and change the 'Accept' type to 'text/html' (not json)
  //
  // NB: Middleware position (before routing) is important!
  //
  app.use(function (req, res, next) {
    var UA = req.get('user-agent');

    if (UA && ((UA.indexOf('facebookexternalhit') !== -1) || UA.indexOf('Facebot') !== -1)) {
      console.log('HEY Facebook!');

      req.headers.accept = 'text/html';
    }

    if (UA && UA.indexOf('Google (+https://developers.google.com/+/web/snippet/)') !== -1) {
      console.log('HEY Google+!');

      req.headers.accept = 'text/html';
    }

    if (UA && UA.indexOf('Twitterbot') !== -1) {
      console.log('HEY Twitter!');

      req.headers.accept = 'text/html';
    }

    next();
  });


  //
  // Passport strategies
  //

  (function () {
    var conf = require('../conf');

    //
    // Facebook strategy (see: https://github.com/jaredhanson/passport-facebook)
    //

    var FACEBOOK_CLIENT_ID = conf.facebook_client_id;
    var FACEBOOK_CLIENT_SECRET = conf.facebook_client_secret;
    var FACEBOOK_REDIRECT_URI = conf.facebook_redirect_uri;

    var passport = require('passport');
    var FacebookStrategy = require('passport-facebook').Strategy;

    passport.use(new FacebookStrategy({
        clientID: FACEBOOK_CLIENT_ID,
        clientSecret: FACEBOOK_CLIENT_SECRET,
        callbackURL: FACEBOOK_REDIRECT_URI,
        profileFields: ['id', 'email']
      }, function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
          console.log('facebook success:', profile, accessToken, refreshToken);

          return done(null, profile);
        });
      }
    ));

    //
    // Google Strategy (see: https://www.npmjs.com/package/passport-google-oauth20)
    //

    var GOOGLE_CLIENT_ID = conf.google_client_id;
    var GOOGLE_CLIENT_SECRET = conf.google_client_secret;
    var GOOGLE_REDIRECT_URI = conf.google_redirect_uri;

    var passport = require('passport');
    var GoogleStrategy = require('passport-google-oauth20').Strategy;

    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_REDIRECT_URI,
        scope: ['profile', 'email']
      }, function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
          console.log('google success:', profile, accessToken, refreshToken);

          return done(null, profile);
        });
      }
    ));

    //
    //
    //

    passport.serializeUser(function(user, done) {
      done(null, user); // TODO: to keep the session cookie small -> only serialize user.username (the only relevant info for us later)
    });
    passport.deserializeUser(function(obj, done) {
      done(null, obj);
    });

    app.use(passport.initialize());
    app.use(passport.session());

  }());

  /*
  ########   #######  ##     ## ######## ########  ######
  ##     ## ##     ## ##     ##    ##    ##       ##    ##
  ##     ## ##     ## ##     ##    ##    ##       ##
  ########  ##     ## ##     ##    ##    ######    ######
  ##   ##   ##     ## ##     ##    ##    ##             ##
  ##    ##  ##     ## ##     ##    ##    ##       ##    ##
  ##     ##  #######   #######     ##    ########  ######
  */

  app.head('/ping', function (req, res, next) {
    res.header('Cache-Control', 'must-revalidate');
    res.send(204);
  });

  (function () {
    //
    // Rewrite cache bustered files (http://stackoverflow.com/questions/18202876)
    //

    app.get('/:md5([a-zA-Z0-9]{32})*', removeHash, staticMiddleware, restoreUrl);

    function removeHash(req, res, next) {
      req._urlbackup = req.url; // backup

      var md5 = req.params.md5;
      req.url = req.url.replace(md5, '');

      // Expires in 1 year in the future
      function seconds2Years(seconds) {
        return (seconds / (3600*24*365));
      }
      var d = new Date();
      d.setFullYear(d.getFullYear() + Math.floor(seconds2Years(+conf.www_static_maxage || 31536000))); // year += 1
      var httpdate = d.toUTCString();
      //console.log('httpdate', httpdate);
      res.set('Expires', httpdate);

      next();
    }

    function restoreUrl(req, res, next) {
      req.url = req._urlbackup;
      delete req._urlbackup;

      next();
    }
  }());

  app.get('/', function (req, res, next) {
    res.render('home', {});
  });

  var api = require('./api');
  app.redis = api.redis;
  app.use('/api/1.0/', api);

  //
  //
  //

  app.get('/', function (req, res, next) {
    res.render('home', {});
  });

  //
  // Error pages (4xx-5xx)
  //
  // https://github.com/visionmedia/express/blob/master/examples/error-pages/index.js
  //

  app.get(/\/([45][0-9]{2})/, function(req, res, next){
    var code = req.params[0];

    var er = new Error();
    er.status = code;
    
    next(er); // pass to the error middleware
  });

  //
  // Errors
  //

  // Errors
  var error = require('./middleware/error')
  app.use(error)

  app.server = undefined;
  function start(cb) {
    var pg = require('pg');
    function ensureDB(dbname, cb) {
      //
      // Create Database if not exist (see: https://stackoverflow.com/questions/20813154/node-postgres-create-database)
      //

      function doesDbExist(dbname, cb) {
        console.log('doesDbExist')

        // ssl: https://stackoverflow.com/a/24962040/133327
        if (conf.postgres_ssl === "true") {
          conf.postgres_uri.search="?ssl=true";
        }

        pg.connect(require('url').format(conf.postgres_uri), function (er, client, done) {
          if (er || !client) {
            cb(null, false); // Error while connecting to the DB
          } else {
            cb(null, true);
            client.end()
          }
        })
      }

      function createDB(dbname, cb) {
        let postgresUri2 = url.parse(url.format(conf.postgres_uri))
        postgresUri2.pathname = '/postgres';
        postgresUri2 = url.format(postgresUri2);

        var client = new pg.Client(postgresUri2);
        client.connect(function (er) {
          if (er) return cb(er);

          client.query(`CREATE DATABASE ${dbname}`, (er) => {
            if (er) return cb(er);

            console.log(`Ok, database '${dbname}' just created.`)
            
            client.end((er) => {
              if (er) return cb(er);

              cb(null);
            })
          })
        })
      }

      doesDbExist(dbname, function (er, result) {
        if (er) return cb(er);

        if (result === false) {
          console.log("DB `%s` does not exist yet, let's create it then...", dbname)
          createDB(dbname, function (er) {
            if (er) return cb(er);

            console.log("Ok, DB `%s` just created", dbname)
            cb(null);
          })
        } else {
          console.log("Ok, DB `%s` does already exist", dbname)
          cb(null)
        }
      })
    }

    var dbname = url.parse(url.format(conf.postgres_uri)).pathname.substr(1)
    console.log('dbname=', dbname)
    ensureDB(dbname, function (er) {
      if (er) return cb(er);

      sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";').catch(function (er) {cb(er)}).then(function () {
        // Sync all models that aren't already in the database
        console.log('syncing DB');
        sequelize.sync(/*{force: true}*/).catch(function (er) {cb(er)}).then(function () {
          console.log('synced DB');

          var url = require('url');
          var port = url.parse(url.format(conf.www_host)).host.split(':')[1];
          port = process.env.PORT || port;
          app.server = app.listen(port, function (er) {
            if (er) return cb(er);

            console.log('App is now listening on port %s', port);
            app.emit('started');
            cb(null);
          });
        });
      });

    })
  }
  app.start = start;

  function stop(cb) {
    app.sequelize.close().catch(function (er) {
      console.log('error closing DB!')
      cb(er);
    }).then(function () {
      console.log('DB now closed!')

      app.redis.client.quit(function (er) {
        if (er) {
          console.log('error while quitting redis')
          return cb(er);
        }

        app.server.close(function (er) {
          if (er) {
            console.log('error while closing server')
            return cb(er);
          }

          console.log('Redis now closed!')
          cb(null)
        });

      });
    });
  }
  app.stop = stop;

  return app;
};
