var conf = require('../../conf');

// DB fields names for each network
var networksFieldNames = {
  facebook: 'facebookid',
  google: 'googleid'
};

function make(network) {
  if (!(network in networksFieldNames)) throw new Error('Network not implemented')
  var fieldName = networksFieldNames[network];

  return function (req, res, next) {
    function register(network, networkid, email, cb) {
      var uri = require('url').parse(require('url').format(conf.www_host));
      uri.pathname = '/api/1.0/users';
      uri = require('url').format(uri);
      
      var body = {
        email: email, // if provided
        quickregister: 1
      };
      var fieldName = networksFieldNames[network];
      body[fieldName] = networkid;

      req.uest({
        method: 'POST',
        uri: uri,
        body: body
      }, function (er, resp, data) {
        if (er) return cb(er);

        var user = data;
        cb(null, user);
      });
    }

    function login(user, cb) {
      require('./tokens').generateLoginLink(user, {email: false}, function (er, href) {
        if (er) return cb(er);

        // Append ?next= param to href from req.session.next
        if (req.session.next) {
          var u = require('url').parse(href);
          u.query || (u.query = {});
          u.query.next = req.session.next;

          delete req.session.next;

          href = require('url').format(u);
        }

        cb(null, href);
      });
    }

    //
    // Success (profile infos are stored by passport into req.session.passport.user)
    //
    console.log('passport user', req.session.passport.user);
    
    var id = req.session.passport.user.id;
    var email = (req.session.passport.user.emails && req.session.passport.user.emails[0].value);
    delete req.session.passport; // clear passeport session infos since we don't need it anymore
    var redirect = req.query.next;

    //
    // Check if that account is linked with a user in our DB 
    //

    var where = {};
    where[fieldName] = id;

    req.models.User.findOne({
      where: where
    }).catch(function (er) {next(er);}).then(function (userinstance) {
      console.log('userinstance', userinstance);

      debugger;

      if (!userinstance) {
        //
        // No user found with this network id
        //
        console.log('no user found with this %s', fieldName, id);

        //
        // Trying with email provided by network
        //
        if (email) {
          req.models.User.findOne({
            where: {email: {$iLike: email}}
          }).catch(function (er) {next(er);}).then(function (userinstance) {
            if (!userinstance) {
              //
              // No existing user found (neither with network id nor email) => let's REGISTER him by his network id
              //
              register(network, id, email, function (er, user) {
                if (er) return next(er);

                login(user, function (er, href) {
                  if (er) return next(er);

                  res.redirect(href);
                });
              });
              
            } else {
              //
              // FOUND user by his network email in DB => persist his networkid + lets LOGIN him
              //

              userinstance[fieldName] = id;
              userinstance.save().catch(function (er) {next(er);}).then(function (user) {
                login(userinstance.toJSON(), function (er, href) {
                  if (er) return next(er);

                  res.redirect(href);
                });
              });
            }
          });
        } else {
          //
          // Not found by network id and no email provided => REGISTER + LOGIN
          //
          register(network, id, email, function (er, user) {
            if (er) return next(er);

            login(user, function (er, href) {
              if (er) return next(er);

              res.redirect(href);
            });
          });
        }
      } else {
        //
        // FOUND user by his network id => lets LOGIN him
        //

        console.log('found user found with this %s', fieldName, id);
        login(userinstance.toJSON(), function (er, href) {
          if (er) return next(er);

          // var u = require('url').parse(href);
          // u.query || (u.query = {});
          // u.query.next = '/toto';
          // href = require('url').format(u);

          res.redirect(href);
        });
      }
    });

  }
}

exports.facebook = make('facebook');

exports.google = make('google');