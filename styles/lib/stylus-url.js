var Compiler = require('stylus').Compiler
  , nodes = require('stylus').nodes
  , parse = require('url').parse;

var myurl = require('../../server/lib/url');

//var conf = require('../../conf/')
//console.log('conf=', conf)
//var baseUrl = require('url').format(conf.www_host);
//console.log('baseUrl', baseUrl)
var md5HashTable = require('../tmp/md5public.json');
//console.log('md5HashTable=', md5HashTable)

var settings = {
  //baseUrl: baseUrl,
  md5HashTable: md5HashTable,
  //cdnHosts: (conf.www_cdn && conf.www_cdn.split(' ') || [])
};

module.exports = function (options) {

  function fn(url){
    // Compile the url
    var compiler = new Compiler(url);
    compiler.isURL = true;
    url = url.nodes.map(function(node){
      return compiler.visit(node);
    }).join('');

    // Parse literal
    url = parse(url);

    var href = myurl(url.href, {md5: true}, settings);

    var literal = new nodes.Literal('url("' + href + '")');

    return literal;
  };

  fn.raw = true;
  return fn;
};
