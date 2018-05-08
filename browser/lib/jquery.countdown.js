// float labels
(function () {
  var $ = this.jQuery || require('jquery');
  var _ = this.underscore || require('underscore');
  var Backbone = this.Backbone || require('backbone');
  Backbone.$ = $;

  var pad = require('../../brover/pad');

  function Countdown(el, options) {
    options || (options = {});
    _.defaults(options, {});

    this.$el = $(el);
    this.el = this.$el[0];

    this.$m = this.$el.find('[data-countdown-m]');
    this.$s = this.$el.find('[data-countdown-s]');

    _.extend(this, Backbone.Events);

    this.expires_at = this.$el.data('countdown');

    this.int = setInterval(this.update.bind(this), 100);

    this.$el.data('countdown', this);
  }
  Countdown.prototype.update = function () {
    var diff = (new Date(this.expires_at) - new Date()) /1000;

    if (diff <= 0) {
      this.trigger('zero');
      clearInterval(this.int);
    }
    diff = Math.max(diff, 0);

    this._m = this.m;
    this.m = Math.floor(diff/60);

    this._s = this.s;
    this.s = Math.floor((diff/60 - Math.floor(diff/60)) *60);

    if (this.m !== this._m) {
      this.$m.text(pad(this.m));
    }

    if(this.s !== this._s) {
      this.$s.text(pad(this.s));
    }
  };

  $.fn.countdown = function (options) {
    this.each(function (i, el) {
      new Countdown(el, options);
    });
  };

  this.Countdown = Countdown;
  if (typeof module !== "undefined" && module !== null) {
    module.exports = this.Countdown;
  }
}).call(this);