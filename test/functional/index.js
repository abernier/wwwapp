//
// Don't forget to START A SELENIUM SERVER before:
//
// java -jar ~/Downloads/selenium-server-standalone-2.33.0.jar then visit http://localhost:4444/wd/hub
//

var conf = require('../../conf');
console.log('conf=', conf)

var wd = require('wd');
var assert = require('assert');
var async = require('async');
var _ = require('underscore');
const url = require('url')

var tap = require('tap');

var hub = url.parse(url.format(conf.selenium_hub));
let saucelabs_username = conf.saucelabs_username;
let saucelabs_accesskey = conf.saucelabs_accesskey;

let isSaucelabs = (hub.hostname.indexOf('saucelabs.com') !== -1 || ''+hub.port === '4445');
if (isSaucelabs) {
  if (hub.auth) {
    let auth = hub.auth.split(':');

    if (auth[0] && !saucelabs_username) {
      saucelabs_username = auth[0];
    }
    if (auth[1] && !saucelabs_accesskey) {
      saucelabs_accesskey = auth[1];
    }
  } else {
    if (saucelabs_username && saucelabs_accesskey) {
      hub.auth = saucelabs_username+':'+saucelabs_accesskey;
    }
  }
}
console.log('saucelabs_username=', saucelabs_username)
console.log('saucelabs_accesskey=', saucelabs_accesskey)
console.log('hub=', url.format(hub))

var request = require('request');

//
// Test flow
//
// For tap documentation: https://github.com/isaacs/node-tap/blob/master/example/test/test-example.js
//

const build = ""+new Date().getTime();

function sandboxScenario(desiredCapabilities, scenario, done) {
  var browser = wd.remote(url.format(hub)); // https://github.com/admc/wd#browser-initialization

  browser.init(desiredCapabilities, function (er, sessionId, capabilities) {
    if (er) return done(er);

    tap.test(JSON.stringify(desiredCapabilities), function (rootTest) {

      //
      // tests
      //

      scenario(browser, rootTest.test);

      //
      // teardown
      //

      rootTest.test('tearDown', function (t) {
        if (isSaucelabs) {
          if (!saucelabs_username || !saucelabs_accesskey) {
            done(new Error('Saucelabs credentials needed in conf.'));
            return;
          }

          var passed = rootTest.passing();
        
          //
          // Saucelabs annotations (see: https://wiki.saucelabs.com/display/DOCS/Annotating+Tests+with+the+Sauce+Labs+REST+API#AnnotatingTestswiththeSauceLabsRESTAPI-Examples)
          //

          var endpoint = "https://saucelabs.com/rest/v1/"+saucelabs_username+"/jobs/"+sessionId;
          endpoint = url.parse(endpoint);
          endpoint.auth = saucelabs_username+':'+saucelabs_accesskey;
          //console.log('endpoint=', endpoint);

          request({
            method: 'PUT',
            url: url.format(endpoint),
            body: {
              "name": "build-"+build,
              "passed": passed,
              "public": "public",
              "build": build
            },
            json: true
          }, function (er, resp, data) {
            browser.quit();
            t.end();
            rootTest.end();

            // Normalize error
            if (er || (resp && resp.statusCode >= 400)) {
              er || (er = new Error(JSON.stringify((data && data.message))));
              er.status = resp && resp.statusCode;

              done(er);
              return;
            }
            
            done(null);
          });
        } else {
          browser.quit();
          t.end();
          rootTest.end();
          
          done(null);
        }
      })
    });
  });
}

var scenari = require('./scenari');

var fns = [];
_.each(conf.selenium_capabilities, function (capabilities) {
  _.each(scenari, function (scenario) {
    fns.push(function (cb) {
      sandboxScenario(capabilities, scenario, cb);
    });
  });
});

async.parallelLimit(async.reflectAll(fns), conf.selenium_concurrent, function (er, results) {
  // collect errors (due to reflectAll)
  var ers = [];
  results.forEach(function (result) {
    if (result.error) {ers.push(result.error);}
  });

  if (ers.length) throw ers;
});
