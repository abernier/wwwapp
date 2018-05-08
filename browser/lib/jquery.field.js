// float labels
(function () {
  var $ = this.jQuery || require('jquery');
  var _ = this.underscore || require('underscore');
  var Backbone = this.Backbone || require('backbone');
  Backbone.$ = $;

  function Field(el) {
    this.$el = $(el);
    this.el = this.$el[0];

    this.$field = this.$el.closest('.field');

    this.$label = this.$field.find('em');
    this.$error = this.$field.find('strong');

    this.$el.on('keydown change', this.onchange.bind(this));
    this.$el.on('focus', this.onfocus.bind(this));
    this.$el.on('blur', this.onblur.bind(this));

    if (this.$el.is('[required]')) {
      this.$field.addClass('required');
    }

    this.onchange({checkValidity: false});

    _.extend(this, Backbone.Events);

    this.$el.data('field', this);
  }
  Field.prototype.onchange = function () {
    var val;
    setTimeout(function () {
      val = this.$el.val();

      if (val !== '') {
        this.$field.addClass('notempty');
        this.$field.removeClass('empty');
        this.trigger('notempty');
      } else {
        this.$field.removeClass('notempty');
        this.$field.addClass('empty');
        this.trigger('empty');
      }

      this.checkValidity();

      this.trigger('change');

      if (this.$el.is('select')) {
        this.$el.blur();
      }
    }.bind(this), 1);
  };
  Field.prototype.onfocus = function () {
    console.log('focus');

    this.$field.addClass('focus');
    this.trigger('focus');
  };
  Field.prototype.onblur = function () {
    this.$field.removeClass('focus');
    this.trigger('notfocus');
  };
  Field.prototype.checkValidity = function () {
    if ('checkValidity' in this.el) {
      var valid = this.el.checkValidity();
      if (valid === true) {
        this.$field.addClass('valid');
        this.$field.removeClass('invalid');
        this.trigger('valid');
      } else {
        this.$field.addClass('invalid');
        this.$field.removeClass('valid');
        this.trigger('invalid');
      }

      return valid;
    }
  };
  Field.prototype.displayValidationMessage = function (validationMessage) {
    validationMessage || (validationMessage = this.$el.data('field-validationmessage') || this.el.validationMessage);
    
    this.checkValidity();

    this.$error.html(validationMessage);
  }

  $.fn.field = function (options) {
    this.each(function (i, el) {
      new Field(el);
    });
  };

  this.Field = Field;
  if (typeof module !== "undefined" && module !== null) {
    module.exports = this.Field;
  }
}).call(this);