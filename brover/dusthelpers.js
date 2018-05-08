var dust = require('dustjs-linkedin');
require('dustjs-helpers');

exports = dust.helpers;

//
// Query string merge helper for dust
//
// Merge querystring parameters in order
//
//   - {@querymerge q1="q=foo"/} will output q=foo
//   - {@querymerge q1="q=foo" q2="bar=baz"/} will output q=foo&bar=baz
//   - {@querymerge q1="q=foo" q2="q=fooobar=baz"/} will output q=fooo&bar=baz (notice fooo takes precedence)
//

var _ = require('underscore');
var qs = require('querystring');

exports.querymerge = function (chunk, ctx, bodies, params) {

  // merge every params in order
  o = _.extend.apply(null, [{}].concat(_.values(params).map(function (el) {
    el = dust.helpers.tap(el, chunk, ctx);
    return qs.parse(el);
  })));

  return chunk.write(qs.stringify(o));
};

//
// moment.js (http://momentjs.com)
//
// {@moment value="2011-10-10" format="'MMMM Do YYYY, h:mm:ss a'"/}   see: http://momentjs.com/docs/#/displaying/format/
// {@moment value="2011-10-10" fromNow="true"/}                     see: http://momentjs.com/docs/#/displaying/fromnow/
// {@moment value="2011-10-10" lang="'fr'" add="'day', 1" calendar=""/}
// {@moment value="2011-10-10" format="'MM-DD-YYYY'"}Date: $moment{:else}Not a valid date{/moment}
//

var _ = require('lodash');
var moment = require('moment');
require('moment/locale/fr');
//console.log('moment', moment.locale())
//console.log(moment(new Date()).format('D MMMM YYYY'));

exports.moment = function (chunk, ctx, bodies, params) {
  if (!params) return;

  // Get value
  var value = params.value;
  if (!value) return;
  value = dust.helpers.tap(value, chunk, ctx);

  // Methods
  var methods = _.omit(params, 'value');
  console.log('methods', methods)

  debugger;
  var ret;
  try {(function () {
    var mmt = moment(value);

    // Apply methods sequentially
    _(methods).each(function (methodArgs, methodName) {
      console.log('methodArgs', methodArgs);
      console.log('methodName', methodName);

      // tap argments to eval {variables} in it
      methodArgs = dust.helpers.tap(methodArgs, chunk, ctx);
      console.log('methodArgs tapped', methodArgs);

      // transform into array of arguments
      methodArgs = (eval("[" + methodArgs + "]"));

      ret = mmt[methodName].apply(mmt, methodArgs);
    });
  }())} catch(e) {
    console.error('Error while applying moment', e);
    ret = false;
  };

  if (ret && (ret !== 'Invalid date')) {
    if (bodies.block) {
      return chunk.render(bodies.block, ctx.push({$moment: ret}));
    } else {
      return chunk.write(ret);
    }
  } else {
    if (bodies['else']) {
      return chunk.render(bodies['else'], ctx);
    }
  }
  
};

//
// URL helper
//
// {@url href="/signup"/} => /signup
// {@url href="/signup" absolute="true"/} => http://platdujour.org/signup
// {@url href="/toto.css" md5="true"/} => /77044deb5f2493eaedd252cea3dc3739/toto.css
// {@url href="/toto.css" cdn="true"/} => //localhost:8080/77044deb5f2493eaedd252cea3dc3739/toto.css (NB: note that md5 is enabled by default when cdn:true)
// {@url href="/restaurants/gustibus/foo.png" cdn="true" cdnPrefix="id:platdujour-couchapp"/} => //localhost.:8080/id:platdujour-couchapp/restaurants/gustibus/foo.png
// {@url href="/toto.css" cdn="true" absolute="true"/} => http://localhost:8080/77044deb5f2493eaedd252cea3dc3739/toto.css
//
// {@url href="/signup"}{$url}{/url} => /signup (NB: you can also have a body, with $url var inside)
//

var myurl = require('../server/lib/url');

exports.url = function (chunk, ctx, bodies, params) {
  // href param
  var href = params.href;
  if (!href) return;
  href = dust.helpers.tap(href, chunk, ctx);

  // Options
  var options = {};
  if ('absolute' in params && params.absolute !== 'false') {
    options.absolute = true;
  }
  if ('cdn' in params && params.cdn !== 'false') {
    options.cdn = true;
    options.md5 = true; // enable md5 when cdn
  }
  if ('cdnPrefix' in params) {
    options.cdnPrefix = dust.helpers.tap(params.cdnPrefix, chunk, ctx);
  }
  if ('md5' in params && params.md5 !== 'false') {
    options.md5 = true;
  }

  // Settings
  var settings = {
    baseUrl: dust.helpers.url.baseUrl(),
    md5HashTable: dust.helpers.url.md5,
    cdnHosts: dust.helpers.url.hosts
  };

  var ret = myurl(href, options, settings);
  
  if (bodies.block) {
    ctx = ctx.push({$url: ret}); // push the $url variable to the context
    chunk = chunk.render(bodies.block, ctx);
  } else {
    chunk = chunk.write(ret);
  }
  return chunk;
};

//
// helper that prints URL for a couchDB attachment
//
// {@attachment db="restaurant" id="gustibus" filename="2013-11-23.png"/} => http://localhost:5984/restaurant/gustibus/2013-11-23.png
//

exports.attachment = function (chunk, ctx, bodies, params) {
  // href param
  var db = params.db;
  var id = params.id;
  var filename = params.filename;

  if (!db || !id || !filename) return;
  db = dust.helpers.tap(db, chunk, ctx);
  id = dust.helpers.tap(id, chunk, ctx);
  filename = dust.helpers.tap(filename, chunk, ctx);

  // Already an URL ?
  /*if (filename.match(/^https?:\/\//)) {

  }*/

  var host = dust.helpers.attachment.host;

  var ret = host + '/' + db +'/' + id + '/' + filename
  ret = encodeURI(ret); // http://stackoverflow.com/questions/75980/best-practice-escape-or-encodeuri-encodeuricomponent

  if (bodies.block) {
    return chunk.render(bodies.block, ctx.push({$attachment: ret}));
  } else {
    return chunk.write(ret);
  }
};

//
// Determine if `str` param is an URL!
//
// {@isurl str="foo.png"}yes{:else}no{/isurl} => no
// {@isurl str="https://example.org/foo.png"}yes{:else}no{/isurl} => yes
//

exports.isurl = function (chunk, ctx, bodies, params) {
  if (!params) {
    if (bodies['else']) {
      chunk.render(bodies['else'], ctx);
    }
    return chunk;
  }

  var str = params.str;
  if (!str) {
    if (bodies['else']) {
      chunk.render(bodies['else'], ctx);
    }
    return chunk;
  }

  str = dust.helpers.tap(str, chunk, ctx);
  if (str) {
    var isUrl = !!str.match(/^https?:\/\//);
    if (isUrl) {
      return chunk.render(bodies.block, ctx);
    } else if (bodies['else']) {
      return chunk.render(bodies['else'], ctx);
    }
  } else if (bodies['else']) {
    return chunk.render(bodies['else'], ctx);
  }

  return chunk;
};

//
// {@keyvalue:myobject}
//   {key} - {value}
// {/keyvalue}
//
// See: http://stackoverflow.com/questions/10564997/dust-js-output-json-key/11278279#11278279
//

exports.keyvalue = function(chunk, context, bodies){
  var items = context.current(), //this gets the current context hash from the Context object (which has a bunch of other attributes defined in it)
      ctx;

  for (key in items) {
    ctx = {"key" : key, "value" : items[key]};
    chunk = chunk.render(bodies.block, context.push(ctx));
  }

  return chunk
}

//
// {@i18n} helper
//

var util = require('util');

exports.i18n = function(chunk, ctx, bodies, params) {
  var lang = dust.helpers.i18n.lang();
  var i18n = (typeof window !== 'undefined' && window.i18n) || require('../locale/' + lang + '/i18n.js');

  // Get key
  var key = params.key;
  if (!key) return;

  // tap params
  for (k in params) {
    if (params.hasOwnProperty(k)) {
      if (k === 'key') continue; // skipping tap key=""
      params[k] = dust.helpers.tap(params[k], chunk, ctx);
    }
  }

  var templateName = ctx.getTemplateName().split('.dust')[0];
  var templatedict = i18n[templateName];

  //console.log('templatedict', templatedict)

  if (!templatedict) return;

  var messageformatfunction = templatedict[key];
  if (!messageformatfunction) {
    console.log('Could not find %s function in the i18n dictionnary. templateName: %s, lang: %s', key, templateName, lang, i18n.lang);
    util.inspect(i18n, {depth: 5});
    return chunk.render(bodies.block, ctx);
  }

  return chunk.write(messageformatfunction(params));

}

//
// {@isnull:mynullvar}yep null{:else}nop, not null{/isnull}
//

exports.isnull = function(chunk, ctx, bodies){
  var mynullvar = ctx.current(); //this gets the current context hash from the Context object (which has a bunch of other attributes defined in it)

  if (_.isNull(mynullvar)) {
    chunk = chunk.render(bodies.block, ctx);
  } else if (bodies['else']) {
    chunk = chunk.render(bodies['else'], ctx);
  }

  return chunk
};

//
// {@isarray arg=myvar}yep array{:else}nop, not array{/isarray}
//

exports.isarray = function(chunk, ctx, bodies, params){
  var myvar = params.arg;

  if (_.isArray(myvar)) {
    chunk = chunk.render(bodies.block, ctx);
  } else if (bodies['else']) {
    chunk = chunk.render(bodies['else'], ctx);
  }

  return chunk
};

//
// {@prettyjson:myjson/}
//

exports.prettyjson = function(chunk, ctx, bodies) {
  var json = ctx.current(); //this gets the current context hash from the Context object (which has a bunch of other attributes defined in it)

  return chunk.write(JSON.stringify(json, null, 4));
};

//
// {@or a=true b=false}wether a OR b are true{:else}no one is true{/or}
//

var _ = require('lodash');
exports.or = function (chunk, ctx, bodies, params) {
  var values = _.values(params);

  var ret = values[0];
  values.splice(1).forEach(function (v) {
    ret = ret || v;
  })

  if (ret) {
    return chunk.render(bodies.block, ctx);
  } else if (bodies['else']) {
    return chunk.render(bodies['else'], ctx);
  }

  return chunk;
};

//
// {@and a=true b=false}wether a AND b are true{:else}one is not true{/and}
//

var _ = require('lodash');
exports.and = function (chunk, ctx, bodies, params) {
  var values = _.values(params);

  var ret = values[0];
  values.splice(1).forEach(function (v) {
    ret = ret && v;
  })

  if (ret) {
    return chunk.render(bodies.block, ctx);
  } else if (bodies['else']) {
    return chunk.render(bodies['else'], ctx);
  }

  return chunk;
};

//
// {@in} helper
//
// {@in arr=myarr key=needle}in{:else}not in{/in}
// {@in arr="1, 2, 3,4" key="2"}in{:else}not in{/in}
// {@in arr="foo" key="foo"}in{:else}not in{/in}
//

exports.in = function(chunk, ctx, bodies, params) {
  var arr = params.arr;
  var key = params.key;

  if (!arr || !key) {
    if (bodies['else']) {
      return chunk.render(bodies['else'], ctx);
    }

    return chunk;
  }

  arr = dust.helpers.tap(arr, chunk, ctx);
  if (!_.isArray(arr)) {
    arr = arr.split(',').map(function (el) {return el.trim();});
  }

  key = dust.helpers.tap(key, chunk, ctx);

  //console.log('arr', arr);
  //console.log('key', key);

  if (arr.indexOf(key) !== -1) {
    return chunk.render(bodies.block, ctx);
  } else if (bodies['else']) {
    return chunk.render(bodies['else'], ctx);
  }
  
  return chunk;
};

//
// {@findWhere} helper (see: http://underscorejs.org/#findWhere)
//
// {@findWhere list=myarr id=3}
//   {o.name}
// {:else}
//   no object with (id === 3) found in list
// {/findWhere}
//
// {@findWhere list=myarr props="id:{num},name:'Antoine'"}
//   {o.name}
// {:else}
//   no object with (id === 3) or (name === 'Antoine') found in list
// {/findWhere}
//

var _ = require('underscore');
exports.findWhere = function(chunk, ctx, bodies, params) {
  var list = params.list;
  if (!list) return;

  console.log('LIST', list);

  var properties;
  if ('props' in params) {
    var props = params.props;
    props = dust.helpers.tap(props, chunk, ctx);
    console.log('props', props)

    try {
      properties = eval("(" + ('{' + props + '}') + ")");
    } catch(e) {}
  } else {
    properties = _.omit(params, 'list');

    // tap properties
    properties = _.mapObject(properties, function (val, key) {
      return dust.helpers.tap(val, chunk, ctx);
    });
  }
  console.log('properties', properties);

  var o = _.findWhere(list, properties);
  console.log('o', o)
  if (o) {
    ctx = ctx.push({o: o});
    chunk = chunk.render(bodies.block, ctx);
  } else if (bodies['else']) {
    chunk = chunk.render(bodies['else'], ctx);
  }

  return chunk;
};

//
// {@uppercase}Doe{/uppercase} => DOE
//

exports.uppercase = function(chunk, ctx, bodies, params) {
  return chunk.capture(bodies.block, ctx, function (data, chunk) {
    chunk.write(data.toUpperCase());
    chunk.end();
  }); 
};