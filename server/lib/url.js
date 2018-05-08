var url = require('url');
var ConsistentHashing = require('consistent-hashing');
var _ = require('lodash');

function myurl(href, options, settings) {
  options || (options = {});
  settings || (settings = {});

  if (!href) return;

  //console.log('myurl href', href)

  debugger;

  options = _.defaults(options, {
    absolute: false,
    md5: false,
    cdn: false,
    cdnPrefix: ''
  });

  function absolute(href, baseUrl) {
    if (baseUrl) {
      href = url.resolve(baseUrl, href);
    } else {
      console.log('WARN: no baseUrl defined in settings.')
    }
    
    return href;
  }

  function md5(href, md5HashTable, baseUrl) {
    md5HashTable || (md5HashTable = {});

    var originalHref = href;
    if (baseUrl) {
      href = url.resolve(baseUrl, href);
    }
    href = url.parse(href);

    // append hash if found in md5HashTable / otherwise, return untouched href
    var pathname = href.pathname;
    if (!(pathname in md5HashTable)) {
      return originalHref;
    }
    
    var hash = md5HashTable[pathname];
    href.pathname = '/'+hash + pathname; // prepend md5

    return href.pathname;
  }

  function cdn(href, cdnHosts, options) {
    options || (options = {});
    cdnHosts || (cdnHosts = []);

    if (cdnHosts.length < 1) return href;

    // Choose a cdn host (using hashring https://github.com/3rd-eden/node-hashring)
    var hashring = new ConsistentHashing(cdnHosts);
    var cdnHost = hashring.getNode(href);

    if (cdnHost) {
      var cdn = url.parse(cdnHost, false, true);

      href = url.parse(href);

      // Merge cdn url with href
      if (options.absolute !== true) {
        cdn.protocol = ''; // protocol-relative URL (http://www.paulirish.com/2010/the-protocol-relative-url/)
      }
      cdn.pathname = href.pathname;
      if (options.prefix) {
        cdn.pathname = ('/'+options.prefix) + cdn.pathname; // append prefix
      }
      cdn.search   = href.search;
      cdn.path     = href.path;
      cdn.query    = href.query;
      cdn.hash     = href.hash;
      cdn.auth     = href.auth;

      href = url.format(cdn);
    }

    return href;
  }

  if (options.md5) {
    href = md5(href, settings.md5HashTable, settings.baseUrl);
  }
  if (options.absolute) {
    href = absolute(href, settings.baseUrl);
  }
  if (options.cdn) {
    href = cdn(href, settings.cdnHosts, {prefix: options.cdnPrefix, absolute: options.absolute});
  }

  return href;
}

module.exports = myurl;
