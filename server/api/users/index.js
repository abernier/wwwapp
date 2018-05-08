var conf = require('../../../conf');

var sha = require('../../lib/sha');
var url = require('url');

var _ = require('lodash');
var properties = require('tea-properties');

var cons = require('consolidate');
var mailer = require('../../mailer');

var request = require('request');

var lists = require('../../../conf').lists;

var sessions = require('./../sessions');
var tokens = require('./../tokens');

// ######## ##     ## ####  ######  ########
// ##        ##   ##   ##  ##    ##    ##
// ##         ## ##    ##  ##          ##
// ######      ###     ##   ######     ##
// ##         ## ##    ##        ##    ##
// ##        ##   ##   ##  ##    ##    ##
// ######## ##     ## ####  ######     ##

exports.exist = function (req, res, next) {
  var id = req.param('id');
  var email = req.param('email');

  debugger;
  var where;
  if (id) {
    where = {id: id}
  } else if (email) {
    where = {email: {$iLike: email}};
  } else {
    // neither id nor email
  }

  if (where) {
    req.models.User.count({
      where: where
    }).catch(function (er) {next(er);}).then(function (count) {
      if (count > 0) {
        res.send(204);
      } else {
        res.send(404);
      }
    });
  } else {
    res.send(404);
  }

};

//  ######  ##     ##  #######  ##      ##
// ##    ## ##     ## ##     ## ##  ##  ##
// ##       ##     ## ##     ## ##  ##  ##
//  ######  ######### ##     ## ##  ##  ##
//       ## ##     ## ##     ## ##  ##  ##
// ##    ## ##     ## ##     ## ##  ##  ##
//  ######  ##     ##  #######   ###  ###

exports.show = function (req, res, next) {
  var id = req.param('id');

  req.models.User.findById(id).catch(function (er) {next(er);}).then(function (userinstance) {
    // Not found user or not owner
    if (userinstance.id !== req.session.user.id) {
      var er = new Error();
      er.status = 403;

      return next(er);
    }

    res.status(200).json(userinstance.toJSON());
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
  var id = req.param('id');
  console.log('Validating user of id: %s', id);

  var email = req.body.email;
  var facebookid = req.body.facebookid;
  var googleid = req.body.googleid;
  var password = req.body.password;
  var firstname = req.body.firstname;
  var lastname = req.body.lastname;
  var birthday = req.body.birthday;
  var acceptoffers = +req.body.acceptoffers;
  var acceptcgu = +req.body.acceptcgu;

  var recaptcha = req.body['g-recaptcha-response'];

  var quickregister = ('quickregister' in req.body);

  var err = [];
  var fns = [];

  function checkUniqueEmail(email, cb) {
    console.log('checkUniqueEmail');

    req.models.User.findOne({
      where: {email: {$iLike: email}}
    }).catch(function (er) {cb(er);}).then(function (userinstance) {
      if (!userinstance || (`${userinstance.id}` === `${id}`)) {
        // Not found any user with that email, or found one but it's the user we are currently checking for
        return cb(null);
      } else {
        err.push({field: 'email', code: 'taken', message: 'That email is already linked to a user.'});
        return cb(err);
      }
    });
  }
  function checkUniqueFacebookid(facebookid, cb) {
    req.models.User.findOne({
      where: {facebookid: facebookid}
    }).catch(function (er) {cb(er);}).then(function (userinstance) {
      if (!userinstance || (`${userinstance.id}` === `${id}`)) {
        // Not found any user with that facebookid, or found one but it's the user we are currently checking for
        return cb(null);
      } else {
        // nok, found
        err.push({field: 'facebookid', code: 'invalid', message: 'That facebookid is already linked to a user.'});
        return cb(err);
      }
    });
  }
  function checkUniqueGoogleid(googleid, cb) {
    req.models.User.findOne({
      where: {googleid: googleid}
    }).catch(function (er) {cb(er);}).then(function (userinstance) {
      if (!userinstance || (`${userinstance.id}` === `${id}`)) {
        // Not found any user with that facebookid, or found one but it's the user we are currently checking for
        return cb(null);
      } else {
        // nok, found
        err.push({field: 'googleid', code: 'invalid', message: 'That googleid is already linked to a user.'});
        return cb(err);
      }
    });
  }
  function checkRecaptcha(cb) {
    request({
      method: 'POST',
      url: 'https://www.google.com/recaptcha/api/siteverify',
      body: {
        secret: conf.recaptcha_secret,
        response: recaptcha
      },
      json: true
    }, function (er, resp, data) {
      if (er) return cb(er);

      cb(null);
    });
  }

  if (!email && !facebookid && !googleid) {
    err.push({field: 'email', code: 'missing', message: 'Please enter your email'});
    err.push({field: 'facebookid', code: 'missing', message: 'Please enter your Facebook id'});
    err.push({field: 'googleid', code: 'missing', message: 'Please enter your Google id'});
  }
  if (email) {
    if (!email.match(/^.*@.*\..*$/)) {
      err.push({field: 'email', code: 'invalid', message: 'Please enter a valid email.'});
    } else {
      fns.push(function (cb) {checkUniqueEmail(email, cb);});
    }
  }
  if (facebookid) {
    fns.push(function (cb) {checkUniqueFacebookid(facebookid, cb);});
  }
  if (googleid) {
    fns.push(function (cb) {checkUniqueGoogleid(googleid, cb);});
  }

  //
  // Additional required fields without `quickregister` mode
  //

  if (!quickregister) {
    if (!email) {
      err.push({field: 'email', code: 'missing', message: 'Please enter your email'});
    }
    if (acceptcgu !== 1) {
      err.push({field: 'acceptcgu', code: 'missing', message: 'Please accept the CGU'});
    }

    // if (!firstname) {
    //   err.push({field: 'firstname', code: 'missing', message: 'Please enter your firstname'});
    // }
    // if (!lastname) {
    //   err.push({field: 'lastname', code: 'missing', message: 'Please enter your lastname'});
    // }

    if (birthday) {
      var d = new Date(Date.parse(birthday));

      // 120 years ago
      var dmin = (function () {
        var d = new Date();
        d.setFullYear(new Date().getFullYear() - 120);
        return d;
      }).call(this);
      
      // 18 years ago
      var dmax = (function () {
        var d = new Date();
        d.setFullYear(new Date().getFullYear() - 18);
        return d;
      }).call(this);

      if (
        (d.toString() === 'Invalid Date')
        ||
        (d < dmin)
        ||
        (d > dmax)
      ) {
        err.push({field: 'birthday', code: 'invalid', message: 'Please enter a valid birthday.'});
      }
    }

  }

  if (conf.recaptcha_id && quickregister && (email && !facebookid && !googleid)) {
    if (!recaptcha) {
      err.push({field: 'recaptcha', code: 'missing', message: 'Please complete the captcha'});
    }
    fns.push(function (cb) {checkRecaptcha(cb);});
  }

  async.series(fns, function (er, results) {
    if (err.length) {
      var er = new Error('Validation failed'); // message
      er.status = 422;
      er.error = err;
      next(er);
    } else {
      res.send(204);
    }
  });
}
exports.validate = validate;

//  ######  ########  ########    ###    ######## ########
// ##    ## ##     ## ##         ## ##      ##    ##
// ##       ##     ## ##        ##   ##     ##    ##
// ##       ########  ######   ##     ##    ##    ######
// ##       ##   ##   ##       #########    ##    ##
// ##    ## ##    ##  ##       ##     ##    ##    ##
//  ######  ##     ## ######## ##     ##    ##    ########

var async = require('async');
var cons = require('consolidate');
exports.create = function (req, res, next) {
  //
  // Validation
  //

  var uri = require('url').parse(require('url').format(conf.www_host));
  uri.pathname = '/api/1.0/users/valid';
  uri = require('url').format(uri);

  debugger;

  req.uest({
    method: 'PUT',
    uri: uri,
    body: req.body
  }, function (er, resp, data) {
    if (er) return next(er);

    console.log('validation ok')

    //
    // Fields validation is OK, let's continue...
    //

    var email = req.body.email;
    var firstname = req.body.firstname;
    var facebookid = req.body.facebookid;
    var googleid = req.body.googleid;
    var password = req.body.password;

    //
    // Automatic `password` if not provided
    //
    var crypto = require('crypto');
    if (!password) {
      password = crypto.randomBytes(18).toString('base64');
    }

    var user = {
      email: email,
      firstname: firstname,
      facebookid: facebookid,
      googleid: googleid,
      password: password
    };

    req.models.User.create(user).catch(function (er) {next(er);}).then(function (userinstance) {
      var user = userinstance.toJSON();

      if (conf.welcomemail === "true" && user.email) {
        //
        // Send a welcome email (with a confirm user account link inside)
        //

        tokens.generateLoginLink(user, {email: true}, function (er, href) {

          var uri = require('url').parse(href);
          uri.query = {
            next: '/me'
          };
          uri = require('url').format(uri);

          var from = (conf.www_mailer_fromname + " <" + conf.www_mailer_fromemail + ">");
          var to = [user.email].join(', ');
          var subject = "Welcome";

          // render and send email
          cons.dust(__dirname + '/../../../views/mails/welcome.dust', {
            title: subject,
            confirmLink: uri,
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
        });
      } else {
        then()
      }

      function then() {
        //
        // Create a session once user created
        //

        var uri = require('url').parse(require('url').format(conf.www_host));
        uri.pathname = '/api/1.0/sessions';
        uri = require('url').format(uri);

        req.uest({
          method: 'POST',
          uri: uri,
          body: {
            id: user.id,
            email: email,
            password: password
          }
        }, function (er, resp, data) {
          if (er) return next(er);

          res.status(201).json(user);
        });
      }

    });
  });
};

// ##     ## ########  ########     ###    ######## ########
// ##     ## ##     ## ##     ##   ## ##      ##    ##
// ##     ## ##     ## ##     ##  ##   ##     ##    ##
// ##     ## ########  ##     ## ##     ##    ##    ######
// ##     ## ##        ##     ## #########    ##    ##
// ##     ## ##        ##     ## ##     ##    ##    ##
//  #######  ##        ########  ##     ##    ##    ########

exports.update = function (req, res, next) {
  var id = req.param('id');
  console.log('update', id);

  //
  // 1. Retrieve actual user
  //

  var uri = require('url').parse(require('url').format(conf.www_host));
  uri.pathname = '/api/1.0/users/'+id;
  uri = require('url').format(uri);

  req.uest({
    method: 'GET',
    uri: uri
  }, function (er, resp, data) {
    if (er) return next(er);

    var user = data;
    console.log('existing user', user)

    //
    // Validation
    //

    var uri = require('url').parse(require('url').format(conf.www_host));
    uri.pathname = '/api/1.0/users/'+id+'/valid';
    uri = require('url').format(uri);

    req.uest({
      method: 'PUT',
      uri: uri,
      body: _.extend({}, user, req.body)
    }, function (er, resp, data) {
      if (er) return next(er);

      console.log('validation ok')

      //
      // Fields validation is OK, let's continue...
      //

      var User = req.models.User;
      User.findById(id).catch(function (er) {next(er);}).then(function (user) {
        //
        // Owner only
        //
        if (user.id !== req.session.user.id) {
          var er = new Error();
          er.status = 403;

          return next(er);
        }

        //
        // Accept offers
        //

        if (req.body.acceptoffers === '1') {
          user.acceptoffers = true;
        } else {
          user.acceptoffers = false;
        }

        // //
        // // jj/mm/aaaa -> yyyy-mm-dd
        // //

        // if (req.body.birthday) {
        //   var matches = req.body.birthday.match(/^([0-9]{1,2})[\/-]([0-9]{1,2})[\/-]([0-9]{4})$/);

        //   var day = matches[1];
        //   var month = matches[2];
        //   var year = matches[3];

        //   req.body.birthday = (year + '-' + month + '-' + day); // yyyy-mm-dd
        // }

        User.describe().catch(function (er) {next(er);}).then(function (attrs) {
          attrs = _.omit(attrs, 'id', 'email_confirmed', 'facebookid', 'googleid'); // these fields cannot be updated (set by req.body)

          for (k in attrs) {
            if (k in req.body) {
              if (req.body[k].length <= 0) {
                user[k] = null;
              } else {
                user[k] = req.body[k];
              }
            }/* else if (typeof req.body[k] === 'undefined') {
              user[k] = null;
            }*/
          }

          //
          // Persist user infos to DB
          //

          user.save().catch(function (er) {next(er);}).then(function () {
            req.models.User.findById(user.id).catch(function (er) {next(er);}).then(function (userinstance) {
              var user = userinstance.toJSON();

              sessions.exposeUser(req, user);

              then();

              function then(er) {
                if (er) return next(er);

                res.status(200).json(user);
              }
            });

          });

        });
      });

    });

  });
};

// ########  ########  ######  ######## ########   #######  ##    ##
// ##     ## ##       ##    ##    ##    ##     ## ##     ##  ##  ##
// ##     ## ##       ##          ##    ##     ## ##     ##   ####
// ##     ## ######    ######     ##    ########  ##     ##    ##
// ##     ## ##             ##    ##    ##   ##   ##     ##    ##
// ##     ## ##       ##    ##    ##    ##    ##  ##     ##    ##
// ########  ########  ######     ##    ##     ##  #######     ##

exports.destroy = function (req, res, next) {
  var id = req.param('id');

  req.models.User.findById(id).catch(function (er) {next(er);}).then(function (user) {
    user.destroy().catch(function (er) {next(er);}).then(function () {
      res.status(204).json({});
    });
  });
};
