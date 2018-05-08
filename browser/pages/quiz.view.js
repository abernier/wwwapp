var _ = require('underscore');
var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;

var $window = $(window);
var $document = $(document);
var $html = $('html');
var $body = $('body');

require('../lib/jquery.countdown.js');

var QuizView = Backbone.View.extend({
  initialize: function (options) {
    options || (options = {});
    this.options = options;

    console.log('QuizView');

    this.$countdown = this.$('[data-countdown]');
    if (this.$countdown.length) {
      this.$countdown.countdown();
      this.countdown = this.$countdown.data('countdown');

      this.countdown.once('zero', function () {
        //console.log('zero');
        window.location.href = window.location.href;
      });
    }
  }
});

module.exports = QuizView;