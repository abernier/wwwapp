#!/usr/bin/env node

var stylus = require('stylus');

var str = require('fs').readFileSync(__dirname + '/../index.styl', 'utf8');

var style = stylus(str)
  .set('include css', true)
  .set('filename', 'index.styl')
  .set('sourcemap', {
    comment: true,
    //inline: true,
    //sourceRoot: '../../public'
    //basePath: __dirname + '/..'
  })
  .include(__dirname + '/..')
  .include(__dirname + '/../../public')
  .define('url', require('../lib/stylus-url')())

style.render(function (er, css) {
    if (er) throw er;

    if (style.sourcemap) {
      require('fs').writeFileSync(__dirname + '/../../public/index.css.map', JSON.stringify(style.sourcemap));
    }

    console.log(css);
  })