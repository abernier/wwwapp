var conf = require('../../conf')
//console.log('conf=', conf)

var tap = require('tap');
var request = require('request');
var _ = require ('underscore');
var async = require('async');

var App = require('../../server/app');
var app = App();

function rand(length) {
  length || (length = 5)
  return ~~(Math.random()*Math.pow(10, length));
}

const uuidv4 = require('uuid/v4');

var User = require('../../server/models').User;
var seed = rand();
var users = {
  'john': {
    email: 'john+test'+seed+'@acme.com',
    email_confirmed: false,
    password: 'pass123',

    firstname: 'John',
    lastname: 'Doe',
    birthday: '1982-05-16 00:00:00+00',
    street: '9, passage Saint Sébastien',
    zip: '75011',
    city: 'Paris',

    facebookid: 'facebook.john.'+seed,
    googleid: 'google.john.'+seed,
    
    acceptcgu: '1',
    acceptoffers: '0',
  },
  'jack': {
    email: 'jack+test'+seed+'@acme.com',
    email_confirmed: false,
    password: 'pass123',

    firstname: null,
    lastname: null,
    birthday: null,
    street: null,
    zip: null,
    city: null,

    facebookid: 'facebook.jack.'+seed,
    googleid: 'google.jack.'+seed,
    
    acceptcgu: null,
    acceptoffers: null,
  }
};

tap.test('setup', function (t) {

  //
  // Start the app
  //

  app.start(function (er) {
    if (er) return t.threw(er);

    //
    // Create fixture users
    //

    fns = [];

    _.each(users, function (user, key) {
      fns.push(function (cb) {
        User.create(user).catch(function (er) {cb(er)}).then(function (userinstance) {
          console.log(key, user);

          user.id = userinstance.id; // persist DB id in memory in order to delete it later

          cb(null);
        });
      });
    });
    
    async.series(fns, function (er) {
      if (er) throw er;

      t.end();
    });
    
  })  
});

//

function uri(pathname, baseUrl) {
  baseUrl || (baseUrl = conf.www_host);
  var url = require('url');

  var uriA = url.parse(url.format(baseUrl));
  var uriB = url.parse(url.format(pathname));

  uriA.pathname = uriB.pathname;
  uriA.path     = uriB.path;
  uriA.search   = uriB.search;
  uriA.query    = uriB.query;
  uriA.hash     = uriB.hash;
  uriA.auth     = uriB.auth;

  return url.format(uriA);
}

function api(options, cb) {
  _.defaults(options, {
    json: true,
    jar: false
  });

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

// ##     ##  ######  ######## ########   ######        ## ##     ##    ###    ##       #### ######## 
// ##     ## ##    ## ##       ##     ## ##    ##      ##  ##     ##   ## ##   ##        ##  ##     ##
// ##     ## ##       ##       ##     ## ##           ##   ##     ##  ##   ##  ##        ##  ##     ##
// ##     ##  ######  ######   ########   ######     ##    ##     ## ##     ## ##        ##  ##     ##
// ##     ##       ## ##       ##   ##         ##   ##      ##   ##  ######### ##        ##  ##     ##
// ##     ## ##    ## ##       ##    ##  ##    ##  ##        ## ##   ##     ## ##        ##  ##     ##
//  #######   ######  ######## ##     ##  ######  ##          ###    ##     ## ######## #### ######## 

tap.test('validate a user', function (t) {

  // Disable recaptcha for testing
  _recaptcha_id = conf.recaptcha_id;
  conf.recaptcha_id = undefined;

  t.test('with bad infos', function (t) {
    api({
      method: 'PUT',
      uri: uri('/api/1.0/users/valid'),
      body: {
        "bad": "body"
      }
    }, function (er, resp, data) {
      t.ok(er.status === 422, 'client error')

      t.end()
    });
  });

  t.test('with quickregister', function (t) {
    t.test('should be OK: new email + quickregister', function (t) {
      var randomemail = 'antoine.bernier+test'+rand()+'@gmail.com';

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/valid'),
        body: {
          "email": randomemail,
          "quickregister": "1"
        }
      }, function (er, resp, data) {
        t.error(er, 'er should be null', er);

        t.ok(resp.statusCode === 204, 'that user should be valid')

        t.end()
      });
    });
    t.test('should be OK: new facebookid + quickregister', function (t) {
      var randomfacebookid = 'antoine.bernier.'+rand();

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/valid'),
        body: {
          "facebookid": randomfacebookid,
          "quickregister": "1"
        }
      }, function (er, resp, data) {
        t.error(er, 'er should be null', er);

        t.ok(resp.statusCode === 204, 'that user should be valid')

        t.end()
      });
    });
    t.test('should be OK: new googleid + quickregister', function (t) {
      var randomgoogleid = 'antoine.bernier.'+rand();

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/valid'),
        body: {
          "googleid": randomgoogleid,
          "quickregister": "1"
        }
      }, function (er, resp, data) {
        t.error(er, 'er should be null', er);

        t.ok(resp.statusCode === 204, 'that user should be valid')

        t.end()
      });
    });

    t.test('should be NOK: already used email + quickregister', function (t) {
      var email = users.john.email;

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/valid'),
        body: {
          "email": email,
          "quickregister": "1"
        }
      }, function (er, resp, data) {
        t.ok(er.status === 422, 'that user should not be valid since `email` is already taken by another user')

        t.end()
      });
    });
    t.test('should be NOK: already used facebookid + quickregister', function (t) {
      var facebookid = users.john.facebookid;

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/valid'),
        body: {
          "facebookid": facebookid,
          "quickregister": "1"
        }
      }, function (er, resp, data) {
        t.ok(er.status === 422, 'that user should not be valid since `facebookid` is already taken by another user')

        t.end()
      });
    });
    t.test('should be NOK: already used googleid + quickregister', function (t) {
      var googleid = users.john.googleid;

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/valid'),
        body: {
          "googleid": googleid,
          "quickregister": "1"
        }
      }, function (er, resp, data) {
        t.ok(er.status === 422, 'that user should not be valid since `googleid` is already taken by another user')

        t.end()
      });
    });

    t.end();
  });

  t.test('without quickregister', function (t) {
    t.test('should be NOK: new email + missing quickregister', function (t) {
      var randomemail = 'antoine.bernier+test'+rand()+'@gmail.com';

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/valid'),
        body: {
          "email": randomemail
        }
      }, function (er, resp, data) {
        t.ok(er.status === 422, 'email is not enough without quickregister')

        var err_fields = _.pluck(er.error, 'field');
        t.ok(err_fields.indexOf('acceptcgu') !== -1, 'without `quickregister`, you must accept the `acceptcgu`');

        t.end()
      });
    });
    t.test('should be NOK: new facebookid + missing quickregister', function (t) {
      var randomfacebookid = 'antoine.bernier.'+rand();

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/valid'),
        body: {
          "facebookid": randomfacebookid
        }
      }, function (er, resp, data) {
        t.ok(er.status === 422, 'facebookid is not enough without quickregister')

        var err_fields = _.pluck(er.error, 'field');
        t.ok(err_fields.indexOf('email') !== -1, 'without `quickregister`, `email` is finally required');
        t.ok(err_fields.indexOf('acceptcgu') !== -1, 'without `quickregister`, you must accept the `acceptcgu`');

        t.end()
      });
    });
    t.test('new googleid + missing quickregister', function (t) {
      var randomgoogleid = 'antoine.bernier.'+rand();

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/valid'),
        body: {
          "googleid": randomgoogleid,
        }
      }, function (er, resp, data) {
        t.ok(er.status === 422, 'googleid is not enough without quickregister')

        var err_fields = _.pluck(er.error, 'field');
        t.ok(err_fields.indexOf('email') !== -1, 'without `quickregister`, `email` is finally required');
        t.ok(err_fields.indexOf('acceptcgu') !== -1, 'without `quickregister`, you must accept the `acceptcgu`');

        t.end()
      });
    });

    t.end();
  });

  t.test('should be OK: validating existing user', function (t) {
    api({
      method: 'PUT',
      uri: uri('/api/1.0/users/'+users.john.id+'/valid'),
      body: users.john
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);

      t.ok(resp.statusCode === 204, 'that user should be valid')

      t.end();
    });
  });

  t.test('validating birthday', function (t) {

    t.test('should be OK: with a valid birthday', function (t) {
      var birthday = '1982-05-16';

      var johnCopy = _.extend({}, users.john);
      johnCopy.birthday = birthday;

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/'+users.john.id+'/valid'),
        body: johnCopy
      }, function (er, resp, data) {
        t.error(er, 'er should be null', er);

        t.ok(resp.statusCode === 204, 'that user should be valid')

        t.end();
      });
    });

    t.test('should be NOK: with an invalid date', function (t) {
      var birthday = 'prout';

      var johnCopy = _.extend({}, users.john);
      johnCopy.birthday = birthday;

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/'+users.john.id+'/valid'),
        body: johnCopy
      }, function (er, resp, data) {
        t.ok(er.status === 422);

        var err_fields = _.pluck(er.error, 'field');
        t.ok(err_fields.indexOf('birthday') !== -1);

        var error = _(er.error).findWhere({field: 'birthday'});
        t.ok(error.code === 'invalid');

        t.end();
      });
    });

    t.test('should be NOK: with a too old birthday', function (t) {
      var birthday = '1882-05-16';

      var johnCopy = _.extend({}, users.john);
      johnCopy.birthday = birthday;

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/'+users.john.id+'/valid'),
        body: johnCopy
      }, function (er, resp, data) {
        t.ok(er.status === 422);

        var err_fields = _.pluck(er.error, 'field');
        t.ok(err_fields.indexOf('birthday') !== -1);

        var error = _(er.error).findWhere({field: 'birthday'});
        t.ok(error.code === 'invalid');

        t.end();
      });
    });

    t.test('should be NOK: with a too recent birthday', function (t) {
      var birthday = (new Date().getFullYear())+'-05-16';

      var johnCopy = _.extend({}, users.john);
      johnCopy.birthday = birthday;

      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/'+users.john.id+'/valid'),
        body: johnCopy
      }, function (er, resp, data) {
        t.ok(er.status === 422);

        var err_fields = _.pluck(er.error, 'field');
        t.ok(err_fields.indexOf('birthday') !== -1);

        var error = _(er.error).findWhere({field: 'birthday'});
        t.ok(error.code === 'invalid');

        t.end();
      });
    });
    
    t.end()
  });

  // Revert recaptcha
  conf.recaptcha_id = _recaptcha_id;

  t.end();
});

// ##     ##  ######  ######## ########   ######        ## ######## ##     ## ####  ######  ########
// ##     ## ##    ## ##       ##     ## ##    ##      ##  ##        ##   ##   ##  ##    ##    ##
// ##     ## ##       ##       ##     ## ##           ##   ##         ## ##    ##  ##          ##
// ##     ##  ######  ######   ########   ######     ##    ######      ###     ##   ######     ##
// ##     ##       ## ##       ##   ##         ##   ##     ##         ## ##    ##        ##    ##
// ##     ## ##    ## ##       ##    ##  ##    ##  ##      ##        ##   ##   ##  ##    ##    ##
//  #######   ######  ######## ##     ##  ######  ##       ######## ##     ## ####  ######     ##

tap.test('check a user exists', function (t) {
  t.test('a non-existing user should be not found by email', function (t) {
    var randomemail = 'toto'+(~~(Math.random()*100000))+'@gmail.com';

    api({
      method: 'HEAD',
      uri: uri('/api/1.0/users?email='+encodeURIComponent(randomemail))
    }, function (er, resp, data) {
      t.ok(er.status === 404, 'no user found with that email')

      t.end()
    });
  });

  t.test('an existing user should be found by email', function (t) {
    api({
      method: 'HEAD',
      uri: uri('/api/1.0/users?email='+encodeURIComponent(users.john.email))
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);

      t.ok(resp.statusCode === 204, 'user found with that email')

      t.end()
    });
  });

  t.test('an existing user should be found by his id', function (t) {
    api({
      method: 'HEAD',
      uri: uri('/api/1.0/users/'+users.john.id)
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);

      t.ok(resp.statusCode === 204, 'user found with that id')

      t.end()
    });
  });

  t.test('an existing user should also be found by his id as a query parameter', function (t) {
    api({
      method: 'HEAD',
      uri: uri('/api/1.0/users?id='+users.john.id)
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);

      t.ok(resp.statusCode === 204, 'user found with that id')

      t.end()
    });
  });

  t.test('an non-existing user should not be found by his id', function (t) {
    api({
      method: 'HEAD',
      uri: uri('/api/1.0/users/'+uuidv4())
    }, function (er, resp, data) {
      t.ok(er.status === 404, 'user not found with that id')

      t.end()
    });
  });

  

  t.end();
});

// ##     ##  ######  ######## ########   ######        ##  ######  ########  ########    ###    ######## ######## 
// ##     ## ##    ## ##       ##     ## ##    ##      ##  ##    ## ##     ## ##         ## ##      ##    ##       
// ##     ## ##       ##       ##     ## ##           ##   ##       ##     ## ##        ##   ##     ##    ##       
// ##     ##  ######  ######   ########   ######     ##    ##       ########  ######   ##     ##    ##    ######   
// ##     ##       ## ##       ##   ##         ##   ##     ##       ##   ##   ##       #########    ##    ##       
// ##     ## ##    ## ##       ##    ##  ##    ##  ##      ##    ## ##    ##  ##       ##     ##    ##    ##       
//  #######   ######  ######## ##     ##  ######  ##        ######  ##     ## ######## ##     ##    ##    ######## 

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

tap.test('create user', function (t) {
  // Disable recaptcha for testing
  _recaptcha_id = conf.recaptcha_id;
  conf.recaptcha_id = undefined;

  t.test('invalid user', function (t) {
    api({
      method: 'POST',
      uri: uri('/api/1.0/users'),
      body: {
        "bad": "body"
      }
    }, function (er, resp, data) {
      t.ok(er.status === 422, 'invalid user datas');

      t.end();
    });
  });

  t.test('quickregister + new email', function (t) {
    var randomemail = 'antoine.bernier+test'+rand()+'@gmail.com';

    //
    // 1. Get already present /messages into inbox (oldMessages)
    // 2. Create a new user
    // 3. Refresh inbox and get new /messages (newMessages)
    // 4. Grab the last email /messages/:id.html
    //

    var oldMessages; // Inbox previous messages
    var newMessages; // Inbox new messages

    api({
      method: 'GET',
      uri: uri('/messages', conf.inbox_uri)
    }, function (er, resp, data) {

      t.error(er, 'er should be null', er);
      t.ok(resp.statusCode === 200, '200 Ok /messages');

      oldMessages = data;

      api({
        method: 'POST',
        uri: uri('/api/1.0/users'),
        body: {
          "email": randomemail,
          "quickregister": "1",
          "email_confirmed": "1" // try to hack `email_confirmed` by enforcing its value to true
        }
      }, function (er, resp, data) {
        debugger;
        t.error(er, 'er should be null', er);

        var user = data;

        t.ok(resp.statusCode === 201, 'user should be created')
        t.ok('email_confirmed' in user && !!user.email_confirmed === false, 'user should not be email_confirmed')

        t.ok(resp.headers['set-cookie'].some(function (cook) {
          return cook.indexOf(conf.www_authcookie_name) !== -1;
        }), 'user authentication cookie was set by the response')

        //
        // Check our new user has received a welcome email with a link to confirm his email
        //

        if (conf.welcomemail === "true") {
          api({
            method: 'GET',
            uri: uri('/messages', conf.inbox_uri)
          }, function (er, resp, data) {
            t.error(er, 'er should be null', er);
            t.ok(resp.statusCode === 200, '200 Ok /messages');

            newMessages = data;

            t.ok(newMessages.length === oldMessages.length+1, '1 new message into inbox');

            // https://stackoverflow.com/questions/13147278/using-underscores-difference-method-on-arrays-of-objects#answer-20797558
            function diff(a, b) {
              var diff = _.difference(_.pluck(a, "id"), _.pluck(b, "id"));
              return _.filter(a, function (obj) {return diff.indexOf(obj.id) >= 0;});  
            }

            var welcomeMessage = diff(newMessages, oldMessages)[0];

            //
            // Check the confirm link is working
            //

            api({
              method: 'GET',
              uri: uri('/messages/'+welcomeMessage.id+'.html', conf.inbox_uri)
            }, function (er, resp, data) {
              t.error(er, 'er should be null', er);

              var html = data;
              console.log('html', html);

              var welcomeEmailDoc = new JSDOM(html).window.document;
              var confirmLink = Array.from(welcomeEmailDoc.querySelectorAll('a[href*="tokens/"]'));
              t.ok(confirmLink.length === 1, 'Found confirm link into the welcome email');

              confirmLink = confirmLink[0];

              //
              // Consume the confirm link + check the user is confirm then
              //

              request({
                method: 'GET',
                uri: confirmLink.href,
                jar: request.jar()
              }, function (er, resp, data) {
                t.error(er, 'er should be null', er);

                User.findById(user.id).catch(function (er) {t.threw(er);}).then(function (userinstance) {
                  t.ok(userinstance.email_confirmed === true, 'User is email_confirmed');

                  t.end();
                });

              });

            });

          });
        } else {
          t.end();
        }

      });

    });
    
  });

  // Revert recaptcha
  conf.recaptcha_id = _recaptcha_id;

  t.end();
});

//  ######  ########  ######   ######  ####  #######  ##    ##  ######        ## ##     ##    ###    ##       #### ########  
// ##    ## ##       ##    ## ##    ##  ##  ##     ## ###   ## ##    ##      ##  ##     ##   ## ##   ##        ##  ##     ## 
// ##       ##       ##       ##        ##  ##     ## ####  ## ##           ##   ##     ##  ##   ##  ##        ##  ##     ## 
//  ######  ######    ######   ######   ##  ##     ## ## ## ##  ######     ##    ##     ## ##     ## ##        ##  ##     ## 
//       ## ##             ##       ##  ##  ##     ## ##  ####       ##   ##      ##   ##  ######### ##        ##  ##     ## 
// ##    ## ##       ##    ## ##    ##  ##  ##     ## ##   ### ##    ##  ##        ## ##   ##     ## ##        ##  ##     ## 
//  ######  ########  ######   ######  ####  #######  ##    ##  ######  ##          ###    ##     ## ######## #### ########  

tap.test('validate a session', function (t) {
  t.test('validate a session with correct fields', function (t) {
    api({
      method: 'PUT',
      uri: uri('/api/1.0/sessions/valid'),
      body: {
        "email": "a@a.com",
        "password": "toto123"
      }
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);
      
     t.ok(resp.statusCode === 204, 'Expected response code')

      t.end();
    });
  });

  t.test('validate a session with client errors', function (t) {
    api({
      method: 'PUT',
      uri: uri('/api/1.0/sessions/valid'),
      body: {
        "bad": "body"
      }
    }, function (er, resp, data) {
      t.ok(er.status === 422, 'Client errors')
      
      var err_fields = _.pluck(er.error, 'field');

      t.ok(err_fields.indexOf('email') !== -1, '`email` should be provided');
      t.ok(err_fields.indexOf('password') !== -1, '`password` should be provided');

      t.end();
    });
  });

  t.end();
});

//  ######  ########  ######   ######  ####  #######  ##    ##  ######        ##  ######  ########  ########    ###    ######## ########         ######   ######## ######## 
// ##    ## ##       ##    ## ##    ##  ##  ##     ## ###   ## ##    ##      ##  ##    ## ##     ## ##         ## ##      ##    ##         ##   ##    ##  ##          ##    
// ##       ##       ##       ##        ##  ##     ## ####  ## ##           ##   ##       ##     ## ##        ##   ##     ##    ##         ##   ##        ##          ##    
//  ######  ######    ######   ######   ##  ##     ## ## ## ##  ######     ##    ##       ########  ######   ##     ##    ##    ######   ###### ##   #### ######      ##    
//       ## ##             ##       ##  ##  ##     ## ##  ####       ##   ##     ##       ##   ##   ##       #########    ##    ##         ##   ##    ##  ##          ##    
// ##    ## ##       ##    ## ##    ##  ##  ##     ## ##   ### ##    ##  ##      ##    ## ##    ##  ##       ##     ##    ##    ##         ##   ##    ##  ##          ##    
//  ######  ########  ######   ######  ####  #######  ##    ##  ######  ##        ######  ##     ## ######## ##     ##    ##    ########         ######   ########    ##    

tap.test('create/get session', function (t) {
  
  t.test('create session - with invalid credentials', function (t) {
    api({
      method: 'POST',
      uri: uri('/api/1.0/sessions'),
      body: {
        email: users.john.email,
        password: 'BAAAAAAAAADDPASSWORD'
      }
    }, function (er, resp, data) {
      t.ok(er.status === 401, 'Unauthorized to create a session');

      t.end();
    });
  });

  var jwt;

  t.test('create session - with valid credentials', function (t) {
    api({
      method: 'POST',
      uri: uri('/api/1.0/sessions'),
      body: {
        email: users.john.email,
        password: users.john.password
      }
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);

      t.ok(resp.statusCode === 201, 'session should be created')

      t.ok(resp.headers['set-cookie'].some(function (cook) {
        if (cook.indexOf(conf.www_authcookie_name) !== -1) {
          // WwwappAuthSession=; Path=/; Expires=Wed, 02 Jan 2019 15:08:41 GMT; HttpOnly
          jwt = cook.split(conf.www_authcookie_name+'=')[1].split(/\s*;\s*/g)[0];
          return true;
        } else {
          return false;
        }
      }), 'authentication cookie should have been set by the response');

      t.ok('user' in data && data.user.id === users.john.id, 'Expected response body')

      t.end();
    });
  });

  t.test('create session - with valid credentials and using `id` rather than email', function (t) {
    api({
      method: 'POST',
      uri: uri('/api/1.0/sessions'),
      body: {
        id: users.john.id,
        password: users.john.password
      }
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);

      t.ok(resp.statusCode === 201, 'session should be created')

      t.ok(resp.headers['set-cookie'].some(function (cook) {
        if (cook.indexOf(conf.www_authcookie_name) !== -1) {
          // WwwappAuthSession=; Path=/; Expires=Wed, 02 Jan 2019 15:08:41 GMT; HttpOnly
          jwt = cook.split(conf.www_authcookie_name+'=')[1].split(/\s*;\s*/g)[0];
          return true;
        } else {
          return false;
        }
      }), 'authentication cookie should have been set by the response');

      t.ok('user' in data && data.user.id === users.john.id, 'Expected response body')

      t.end();
    });
  });

  t.test('get a session - previously created', function (t) {
    var jar = request.jar();
    var cookie = request.cookie(conf.www_authcookie_name+'='+jwt);
    jar.setCookie(cookie, require('url').format(conf.www_host));

    api({
      method: 'GET',
      uri: uri('/api/1.0/session'),
      jar: jar
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);

      t.ok(resp.statusCode === 200);
      t.ok('user' in data && data.user.id === users.john.id, 'expected retrieved session datas');

      t.end();
    });
  });

  t.test('get a session - without authentication cookie', function (t) {
    api({
      method: 'GET',
      uri: uri('/api/1.0/session')
      // no jar
    }, function (er, resp, data) {
      t.ok(er.status === 401);

      t.end();
    });
  });
  
  t.end();
});

//  ######  ########  ######   ######  ####  #######  ##    ##  ######        ## ########  ########  ######  ######## ########   #######  ##    ## 
// ##    ## ##       ##    ## ##    ##  ##  ##     ## ###   ## ##    ##      ##  ##     ## ##       ##    ##    ##    ##     ## ##     ##  ##  ##  
// ##       ##       ##       ##        ##  ##     ## ####  ## ##           ##   ##     ## ##       ##          ##    ##     ## ##     ##   ####   
//  ######  ######    ######   ######   ##  ##     ## ## ## ##  ######     ##    ##     ## ######    ######     ##    ########  ##     ##    ##    
//       ## ##             ##       ##  ##  ##     ## ##  ####       ##   ##     ##     ## ##             ##    ##    ##   ##   ##     ##    ##    
// ##    ## ##       ##    ## ##    ##  ##  ##     ## ##   ### ##    ##  ##      ##     ## ##       ##    ##    ##    ##    ##  ##     ##    ##    
//  ######  ########  ######   ######  ####  #######  ##    ##  ######  ##       ########  ########  ######     ##    ##     ##  #######     ##    

tap.test('destroy a session', function (t) {

  var jar = request.jar();

  //
  // 1. Create a session for John
  //

  api({
    method: 'POST',
    uri: uri('/api/1.0/sessions'),
    body: {
      email: users.john.email,
      password: users.john.password
    },
    jar: jar
  }, function (er, resp, data) {
    t.error(er, 'er should be null', er);

    //
    // 2. Ensure we can GET that session
    //

    api({
      method: 'GET',
      uri: uri('/api/1.0/session'),
      jar: jar
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);

      t.ok(resp.statusCode === 200);
      t.ok('user' in data && data.user.id === users.john.id, 'expected retrieved session datas');

      //
      // 3. Destroy that session
      //

      api({
        method: 'DELETE',
        uri: uri('/api/1.0/session'),
        jar: jar
      }, function (er, resp, data) {
        t.error(er, 'er should be null', er);

        t.ok(resp.statusCode === 204);

        //
        // 4. Ensure we cannont GET it anymore
        //

        api({
          method: 'GET',
          uri: uri('/api/1.0/session'),
          jar: jar
        }, function (er, resp, data) {
          t.ok(er.status === 401);

          t.end();
        });
        
      });

    });
   
  });
});

// ##     ##  ######  ######## ########   ######        ##  ######  ##     ##  #######  ##      ## 
// ##     ## ##    ## ##       ##     ## ##    ##      ##  ##    ## ##     ## ##     ## ##  ##  ## 
// ##     ## ##       ##       ##     ## ##           ##   ##       ##     ## ##     ## ##  ##  ## 
// ##     ##  ######  ######   ########   ######     ##     ######  ######### ##     ## ##  ##  ## 
// ##     ##       ## ##       ##   ##         ##   ##           ## ##     ## ##     ## ##  ##  ## 
// ##     ## ##    ## ##       ##    ##  ##    ##  ##      ##    ## ##     ## ##     ## ##  ##  ## 
//  #######   ######  ######## ##     ##  ######  ##        ######  ##     ##  #######   ###  ###  

tap.test('show user', function (t) {
  t.test("user's datas are private" , function (t) {
    api({
      method: 'GET',
      uri: uri('/api/1.0/users/'+users.john.id)
    }, function (er, resp, data) {
      t.ok(er.status === 403, 'this is not public');

      t.end();
    });
  });

  t.test("owner can read his datas", function (t) {

    var jar = request.jar();

    //
    // 1. Create a session for John
    //

    api({
      method: 'POST',
      uri: uri('/api/1.0/sessions'),
      body: {
        email: users.john.email,
        password: users.john.password
      },
      jar: jar
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);

      t.ok(resp.statusCode === 201, 'session should be created')

      //
      // 2. With that session, get John's datas
      //

      api({
        method: 'GET',
        uri: uri('/api/1.0/users/'+users.john.id),
        jar: jar
      }, function (er, resp, data) {
        t.error(er, 'er should be null', er);

        t.ok(resp.statusCode === 200, 'Expected response code');
        
        t.ok(data.id === users.john.id, 'expected response body');

        t.end();
      });

    });
  });

  t.test("user's datas are restricted to is owner", function (t) {
    var jar = request.jar();

    //
    // 1. Create a session for Jack
    //

    api({
      method: 'POST',
      uri: uri('/api/1.0/sessions'),
      body: {
        email: users.jack.email,
        password: users.jack.password
      },
      jar: jar
    }, function (er, resp, data) {
      t.error(er, 'er should be null', er);

      t.ok(resp.statusCode === 201, 'session should be created')

      //
      // 2. With that session, get John's datas
      //

      api({
        method: 'GET',
        uri: uri('/api/1.0/users/'+users.john.id),
        jar: jar
      }, function (er, resp, data) {
        t.ok(er.status === 403, 'Unauthorized')

        t.end();
      });

    });

  });

  t.end();
});

// ##     ##  ######  ######## ########   ######        ## ##     ## ########  ########     ###    ######## ######## 
// ##     ## ##    ## ##       ##     ## ##    ##      ##  ##     ## ##     ## ##     ##   ## ##      ##    ##       
// ##     ## ##       ##       ##     ## ##           ##   ##     ## ##     ## ##     ##  ##   ##     ##    ##       
// ##     ##  ######  ######   ########   ######     ##    ##     ## ########  ##     ## ##     ##    ##    ######   
// ##     ##       ## ##       ##   ##         ##   ##     ##     ## ##        ##     ## #########    ##    ##       
// ##     ## ##    ## ##       ##    ##  ##    ##  ##      ##     ## ##        ##     ## ##     ##    ##    ##       
//  #######   ######  ######## ##     ##  ######  ##        #######  ##        ########  ##     ##    ##    ######## 

tap.test('update user', function (t) {
  var jar = request.jar();

  //
  // 1. Create a session for John
  //

  api({
    method: 'POST',
    uri: uri('/api/1.0/sessions'),
    body: {
      email: users.john.email,
      password: users.john.password
    },
    jar: jar
  }, function (er, resp, data) {
    t.error(er, 'er should be null', er);

    t.test('normal update', function (t) {
      api({
        method: 'PUT',
        uri: uri('/api/1.0/users/'+users.john.id),
        body: {
          id: uuidv4(), // try to change id (should be ignored)
          firstname: 'Johnn',
          email_confirmed: "1" // try to set `email_confirmed` to true (should be ignored)
        },
        jar: jar
      }, function (er, resp, data) {
        t.error(er, 'er should be null', er);

        api({
          method: 'GET',
          uri: uri('/api/1.0/users/'+users.john.id),
          jar: jar
        }, function (er, resp, data) {
          t.error(er, 'er should be null', er);

          t.ok(resp.statusCode === 200)

          var user = data;

          t.equal(user.id, users.john.id, '`id` should not have changed')
          t.equal(user.email_confirmed, users.john.email_confirmed, '`email_confirmed` should not have changed')

          t.equal(user.firstname, 'Johnn', '`firstname` was updated');
          t.equal(user.lastname, users.john.lastname, '`lastname` should not have changed')

          t.end();
        });

      });
    });

    t.end();
  })

  
});

// ##     ##  ######  ######## ########   ######        ## ########  ########  ######  ######## ########   #######  ##    ## 
// ##     ## ##    ## ##       ##     ## ##    ##      ##  ##     ## ##       ##    ##    ##    ##     ## ##     ##  ##  ##  
// ##     ## ##       ##       ##     ## ##           ##   ##     ## ##       ##          ##    ##     ## ##     ##   ####   
// ##     ##  ######  ######   ########   ######     ##    ##     ## ######    ######     ##    ########  ##     ##    ##    
// ##     ##       ## ##       ##   ##         ##   ##     ##     ## ##             ##    ##    ##   ##   ##     ##    ##    
// ##     ## ##    ## ##       ##    ##  ##    ##  ##      ##     ## ##       ##    ##    ##    ##    ##  ##     ##    ##    
//  #######   ######  ######## ##     ##  ######  ##       ########  ########  ######     ##    ##     ##  #######     ##    

tap.test('destroy user', function (t) {
  // TODO

  t.end();
});

//

tap.test('teardown', function (t) {

  //
  // Destroy fixture users
  //

  fns = [];

  _.each(users, function (user, key) {
    fns.push(function (cb) {
      User.findById(user.id).catch(function (er) {cb(er);}).then(function (userinstance) {
        userinstance.destroy().catch(function (er) {cb(er);}).then(function () {
          cb(null);
        });
      });
    });
  });
  
  async.series(fns, function (er) {
    if (er) throw er;

    //
    // Stop the app
    //

    app.stop(function (er) {
      console.log('app.stop callback')
      if (er) return t.threw(er);

      t.end();
      tap.end();
    });
  });
})