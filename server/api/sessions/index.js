var conf = require('../../../conf');

var url = require('url');
var qs = require('querystring');

var cookie = require('cookie');

var COOKIENAME = conf.www_authcookie_name || 'WwwappAuthSession';
var COOKIETIMEOUT = +conf.www_authcookie_timeout_seconds || 3600*24*365; // default: 1 year
var COOKIESECRET = conf.www_authcookie_secret || 'shhhht';

var _ = require('lodash');
function setAuthsessionCookie(res, value, options) {
  options || (options = {});

  _.defaults(options, {
    timeout: COOKIETIMEOUT
  });

  var opts = {
    expires: new Date(Date.now() + options.timeout*1000),
    version: 1,
    path: '/',
    httpOnly: true
  };

  var cookiename = COOKIENAME;

  //console.log('setAuthsessionCookie', cookiename, value, opts);

  res.cookie(cookiename, value, opts);
}
//
// JWT (see: https://www.npmjs.com/package/jsonwebtoken)
//
var jwt = require('jsonwebtoken');
function payload(user) {
  return {
    id: user.id,
    password: user.password
  };
}
function generateJwt(user) {
  var secret = COOKIESECRET;

  return jwt.sign(payload(user), secret);
}

function exposeUser(req, user) {
  // only expose non-critical infos to session
  var o = {
    id: user.id,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    email_confirmed: user.email_confirmed,
    acceptcgu: user.acceptcgu
  };

  //console.log('Exposed User to req.session.user', o);
  req.session.user = o;

  return o;
}
exports.exposeUser = exposeUser;

exports.isValidsession = function (req, res, next) {
  if (req.validsession === true) return next(); // already validated

  var uri = require('url').parse(require('url').format(conf.www_host));
  uri.pathname = '/api/1.0/session';
  uri = require('url').format(uri);

  req.uest({
    method: 'GET',
    uri: uri
  }, function (er, resp, data) {
    if (er) return next(er);

    next();
  });

};

// ##     ##    ###    ##       #### ######## 
// ##     ##   ## ##   ##        ##  ##     ##
// ##     ##  ##   ##  ##        ##  ##     ##
// ##     ## ##     ## ##        ##  ##     ##
//  ##   ##  ######### ##        ##  ##     ##
//   ## ##   ##     ## ##        ##  ##     ##
//    ###    ##     ## ######## #### ######## 

function validate(req, res, next) {
  var id = req.body.id;
  var email = req.body.email;
  var password = req.body.password;

  var err = [];
  var fns = [];

  if (!email && !id) {
    err.push({field: 'email', code: 'missing', message: 'Please enter your email'});
    err.push({field: 'id', code: 'missing', message: 'Please enter your user id'});
  }
  if (email && !email.match(/^.*@.*\..*$/)) {
    err.push({field: 'email', code: 'invalid', message: 'Please enter a valid email.'});
  }
  if (!password) {
    err.push({field: 'password', code: 'missing', message: 'Please enter your password'});
  }
  
  if (err.length) {
    var er = new Error('Validation failed'); // message
    er.status = 422;
    er.error = err;
    next(er);
  } else {
    res.send(204);
  }
}
exports.validate = validate;

//  ######  ########  ########    ###    ######## ######## 
// ##    ## ##     ## ##         ## ##      ##    ##       
// ##       ##     ## ##        ##   ##     ##    ##       
// ##       ########  ######   ##     ##    ##    ######   
// ##       ##   ##   ##       #########    ##    ##       
// ##    ## ##    ##  ##       ##     ##    ##    ##       
//  ######  ##     ## ######## ##     ##    ##    ######## 

exports.create = function (req, res, next) {
  var id = req.param('id');
  var email = req.param('email');
  var password = req.param('password');

  //
  // Validation
  //

  var uri = require('url').parse(require('url').format(conf.www_host));
  uri.pathname = '/api/1.0/sessions/valid';
  uri = require('url').format(uri);

  req.uest({
    method: 'PUT',
    uri: uri,
    body: req.body
  }, function (er, resp, data) {
    if (er) return next(er);

    console.log('validation ok')

    //
    // Validation ok, let's create a session
    //

    var where = {};
    if (id) {
      where.id = id;
    } else {
      where.email = {$iLike: email};
    }

    var User = req.models.User;
    req.models.User.findOne({
      where: where
    }).catch(function (er) {next(er);}).then(function (user) {
      //console.log('user', user);

      if (!user || !user.validPassword(password)) {
        var er = new Error();
        er.status = 401;
        next(er);
        return;
      }

      user = user.toJSON();

      var tok = generateJwt(user);

      setAuthsessionCookie(res, tok);

      user = exposeUser(req, user);
      //console.log('REQ session', req.session);

      req.validsession = true; // validate session for subsequent requests

      res.status(201).json({
        user: user
      });

    });

  });

};

//  ######  ##     ##  #######  ##      ##
// ##    ## ##     ## ##     ## ##  ##  ##
// ##       ##     ## ##     ## ##  ##  ##
//  ######  ######### ##     ## ##  ##  ##
//       ## ##     ## ##     ## ##  ##  ##
// ##    ## ##     ## ##     ## ##  ##  ##
//  ######  ##     ##  #######   ###  ###

exports.show = function (req, res, next) {
  var cookies = cookie.parse(req.get('cookie') || '');

  if (COOKIENAME in cookies) {
    var cook = cookies[COOKIENAME];
    jwt.verify(cook, COOKIESECRET, function (er, decodedpayload) {
      //console.log('jwt decodedpayload', decodedpayload);
      if (er || !decodedpayload || !decodedpayload.id) {
        var er = new Error('Problem decoding the jwt payload');
        er.status = 401;
        return next(er);
      }
      
      req.models.User.findById(decodedpayload.id).catch(function (er) {next(er);}).then(function (user) {
        if (!user) {
          var er = new Error('payload user not found');
          er.status = 401;
          return next(er);
        }

        if (user.password !== decodedpayload.password) {
          var er = new Error('payload user and password dont match');
          er.status = 401;
          return next(er);
        }

        // Persist user into session
        user = user.toJSON();
        user = exposeUser(req, user);

        // sliding expires
        if (!!conf.www_authcookie_sliding) {
          setAuthsessionCookie(res, cookies[COOKIENAME]);
        }

        res.status(200).json({
          user: user
        });
      });
    });
  } else {
    var er = new Error(`No ${conf.www_authcookie_name} cookie found`);
    er.status = 401;

    return next(er);
  }
};

// ########  ########  ######  ######## ########   #######  ##    ## 
// ##     ## ##       ##    ##    ##    ##     ## ##     ##  ##  ##  
// ##     ## ##       ##          ##    ##     ## ##     ##   ####   
// ##     ## ######    ######     ##    ########  ##     ##    ##    
// ##     ## ##             ##    ##    ##   ##   ##     ##    ##    
// ##     ## ##       ##    ##    ##    ##    ##  ##     ##    ##    
// ########  ########  ######     ##    ##     ##  #######     ##    

exports.destroy = function (req, res, next) {
  setAuthsessionCookie(res, '', {timeout: -600});

  res.send(204);
};