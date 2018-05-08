var conf = require('../../../conf');
var url = require('url');
var cons = require('consolidate');
var request = require('request');
var crypto = require('crypto');

// sha helper func
var sha = require('../../lib/sha');

var mailer = require('../../mailer');
var redis = require('../../redis');

var _ = require('lodash');

var sessions = require('./../sessions');

//  ######   ######## ##    ## ######## ########     ###    ######## ######## ##        #######   ######   #### ##    ## ##       #### ##    ## ##    ## 
// ##    ##  ##       ###   ## ##       ##     ##   ## ##      ##    ##       ##       ##     ## ##    ##   ##  ###   ## ##        ##  ###   ## ##   ##  
// ##        ##       ####  ## ##       ##     ##  ##   ##     ##    ##       ##       ##     ## ##         ##  ####  ## ##        ##  ####  ## ##  ##   
// ##   #### ######   ## ## ## ######   ########  ##     ##    ##    ######   ##       ##     ## ##   ####  ##  ## ## ## ##        ##  ## ## ## #####    
// ##    ##  ##       ##  #### ##       ##   ##   #########    ##    ##       ##       ##     ## ##    ##   ##  ##  #### ##        ##  ##  #### ##  ##   
// ##    ##  ##       ##   ### ##       ##    ##  ##     ##    ##    ##       ##       ##     ## ##    ##   ##  ##   ### ##        ##  ##   ### ##   ##  
//  ######   ######## ##    ## ######## ##     ## ##     ##    ##    ######## ########  #######   ######   #### ##    ## ######## #### ##    ## ##    ## 

function generateLoginLink(user, options, cb) {
  options || (options = {});
  _.defaults(options, {
    email: false
  });

  // 1. generate a random token: 123456
  // 2. persist that token (redis/couchdb's user document?)
  // 3. email that token link to the user's email so he can copy/paste it
  // 4. redirect to /reset in order to let the user paste it

  // 1.
  var token = crypto.randomBytes(30).toString('base64').split('/').join('_').split('+').join('-'); // the token needs to be url-safe.
  var hash = sha(token)
  var data = {
    id: ''+user.id,
    token: ''+token
  };
  if (options.email) {
    data.email = ''+user.email;
  }

  var key = 'pwrecover_' + hash;

  // 2. store in redis
  redis.client.hmset(key, data, function (er) {
    if (er) return cb(er);

    var uri = require('url').parse(require('url').format(conf.www_host));
    uri.pathname = '/api/1.0/tokens/' + token;
    uri = require('url').format(uri);

    var href = uri;

    cb(null, href);

  });
}
exports.generateLoginLink = generateLoginLink;

//  ######  ########  ########    ###    ######## ######## 
// ##    ## ##     ## ##         ## ##      ##    ##       
// ##       ##     ## ##        ##   ##     ##    ##       
// ##       ########  ######   ##     ##    ##    ######   
// ##       ##   ##   ##       #########    ##    ##       
// ##    ## ##    ##  ##       ##     ##    ##    ##       
//  ######  ##     ## ######## ##     ##    ##    ######## 

exports.create = function (req, res, next) {
  var email = req.param('email');

  //
  // Validation
  //

  function validate() {
    var err = [];

    if (!email) {
      err.push({field: 'email', code: 'missing', message: 'Please enter your email'});
    }
    if (email && !email.match(/^.*@.*\..*$/)) {
      err.push({field: 'email', code: 'invalid', message: 'Please enter a valid email.'});
    }

    return err;
  }
  var err = validate();

  if (err.length) {
    var er = new Error('Validation failed'); // message
    er.status = 422;
    er.error = err;

    next(er);
    return;
  }

  //
  // Find user for the provided email
  //

  req.models.User.findOne({
    where: {email: {$iLike: email}}
  }).catch(function (er) {next(er);}).then(function (user) {
    //
    // NOK: user not found with that email
    //

    if (!user) {
      var er = new Error('No user found with that email.');
      er.status = 404;

      next(er);
      return;
    }

    //
    // Ok, user found
    //

    // generate a login link
    generateLoginLink(user, {email: true}, function (er, href) {
      if (er) return next(er);

      // render and send email
      cons.dust(__dirname + '/../../../views/mails/token.dust', {
        _layout: __dirname + '/../../../views/mails/layout-mail.dust',
        loginLink: href
      }, function (er, out) {
        if (er) return next(er);

        // 3.
        mailer.sendMail({
          from: (conf.www_mailer_fromname + " <" + conf.www_mailer_fromemail + ">"),
          to: [user.email].join(', '),
          subject: "Connect link",
          //text: "", // plaintext body
          html: out // html body
        }, function (er, response) {
          if (er) return next(er);

          // 4.
          res.send(204);
          return;
        });
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
  var token = req.param('token');

  debugger;

  var hash = sha(token)
  redis.client.hgetall('pwrecover_' + hash, function (er, data) {
    if (er) return next(er);

    function invalidOrNotfoundToken() {
      var er = new Error('Token not found, or invalid'); // message
      er.status = 404;

      next(er);
      return;
    }

    if (!data) {
      return invalidOrNotfoundToken();
    }

    var id = data.id;
    var email = data.email;
    var verify = data.token;

    if (verify !== token) {
      return invalidOrNotfoundToken();
    }

    //
    // Presented token is now verified against redis one
    //
    // Let's:
    //   1. assign a new random password to the user
    //   2. login the user on behalf with that new temporary password
    //

    // 1.
    req.models.User.findById(id).catch(function (er) {next(er);}).then(function (user) {
      if (!user) {
        var er = new Error('No user found with that token infos');
        er.status = 404;

        return next(er);
      }

      if (conf.justconfirmedemail === "true" && email && user.email_confirmed !== true) {
        // Confirm the user (since he now has verified his email)
        user.email_confirmed = true;

        //
        // send a justconfirmed email
        //

        var subject = 'Votre compte est confirmé';
        var from = (conf.www_mailer_fromname + " <" + conf.www_mailer_fromemail + ">");
        var to = [user.email].join(', ');

        cons.dust(__dirname + '/../../../views/mails/justconfirmed.dust', {
          title: subject,
          user: user
        }, function (er, out) {
          if (er) return next(er);

          mailer.sendMail({
            from: from,
            to: to,
            subject: subject,
            //text: "", // plaintext body
            html: out // html body
          }, function (er, response) {
            //console.log('totiiiiiiiiiiiiiii', er);
            if (er) return next(er);

            then();
          });
        });
      } else {
        then();
      }

      //
      // Generate a new password for the user, and create a session with
      //

      function then() {
        // Set a new password
        var newPass = crypto.randomBytes(18).toString('base64');
        user.password = newPass;

        user.save().catch(function (er) {next(er);}).then(function () {
          // Delete redis token
          redis.client.del('pwrecover_' + hash, function () {});

          var uri = require('url').parse(require('url').format(conf.www_host));
          uri.pathname = '/api/1.0/sessions';
          uri = require('url').format(uri);

          // 2.
          req.uest({
            method: 'POST',
            uri: uri,
            body: {
              id: user.id,
              email: user.email,
              password: newPass
            }
          }, function (er, resp, data) {
            if (er) return next(er);

            res.format({
              json: function () {
                res.send(204);
                return;
              },
              html: function () {
                // flash message
                req.session.messages.flash.push({type: 'info', message: 'Bienvenue, vous êtes maintenant connecté(e).'});

                res.redirect('/');
                return;
              }
            });
          });
          
        });
      }

    });
    
  });
};