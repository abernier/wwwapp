var _ = require('underscore');
var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;

var $window = $(window);
var $document = $(document);
var $html = $('html');
var $body = $('body');

var AuthView = Backbone.View.extend({
  initialize: function (options) {
    options || (options = {});
    this.options = options;

    console.log('AuthView');
  },
  
});

module.exports = AuthView;