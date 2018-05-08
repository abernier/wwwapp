var _ = require('lodash');
var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;

var dust = require('dustjs-linkedin');
require('dustjs-helpers');
require('../brover/dusthelpers');

require('jquery-hammer');
require('./lib/jquery.field.js');
require('jquery-scrollto');

var AuthView = require('./pages/auth.view.js');
var QuizView = require('./pages/quiz.view.js');

var $window = $(window);
var $document = $(document);
var $html = $('html');
var $body = $('body');

function makeRemoveClassHandler(regex) {
  return function (index, classes) {
    return classes.split(/\s+/).filter(function (el) {return regex.test(el);}).join(' ');
  }
}

// WW/WH
var dims = (function () {
  var o = {
    WW: undefined,
    WH: $window.height()
  };

  function viewportSize() {
    var test = document.createElement('div');
   
    test.style.cssText = 'position: fixed;top: 0;left: 0;bottom: 0;right: 0;';
    document.documentElement.insertBefore(test, document.documentElement.firstChild);
    
    var dims = {
      width: test.offsetWidth,
      height: test.offsetHeight
    };
    document.documentElement.removeChild(test);
    
    return dims;
  }

  function setWWH() {
    vpsize = viewportSize();

    o.WW = vpsize.width;
    o.WH = vpsize.height;

    if (o.WW >= o.WH) {
      //$html.removeClass('tall').addClass('wide');
    } else {
      //$html.removeClass('wide').addClass('tall');
    }

    console.log('setwwh', o.WW, o.WH);
    //$html.height(o.WH);
    //$document.trigger('setwwh', [o.WW, o.WH]);
  }
  setWWH();
  //$window.load(setWWH);
  //window.addEventListener('resize', _.debounce(setWWH, 200));

  return o;
}).call(this);

var Router = Backbone.Router.extend({
    initialize: function (options) {
      options || (options = {});
      _.defaults(options, {});
      this.options = options;

      this.dims = dims;

      //
      // Disable console.log for production
      //

      if ($('html').is('.production')) {
        window.console = {};
        window.console.log = function () {};
      }

      //
      // debug
      //

      if (window.location.search.indexOf('?debug') !== -1) {
        $html.addClass('debug');
      }

      //
      // DOM ready
      //
      $(function () {
        $('html').addClass('domready');
        // just after DOM ready (for styling convenience)
        setTimeout(function () {
          $('html').addClass('justafterdomready');
          $(document).trigger('justafterdomready');
        }, 0);

        // ismobile
        (function () {
          // http://stackoverflow.com/questions/11381673/javascript-solution-to-detect-mobile-browser
          function isMobile() {
            return typeof window.orientation !== 'undefined';
          }

          if (isMobile()) {
            $('html').addClass('mobile');
          } else {
            $('html').addClass('no-mobile');
          }
        }).call(this);

        // field
        $('form .field :input').field();
        
        var historyOptions = {
          pushState: true,
          hashChange: false, // no pushState => full refreshes (<=IE9)
          //silent: true
        };
        if (options && options.history && options.history.root) {
        	historyOptions.root = options.history.root;
        }

        // 
        // Here it comes: start the app !
        //

        Backbone.history.start(historyOptions);

      }.bind(this));

      //
      // target
      //

      (function () {

        function target(id, link, options) {
          options || (options = {});

          options = _.extend({}, {
            scroll: true,
            scrollduration: 300,
            scrollparentselector: window,
            toggle: true,
            group: undefined
          }, options)

          //console.log('target', this, arguments);
          var $to = $('#'+id);
          if (!$to.length) return;

          var $from = $('[href="#' + id + '"]');
          var $link = $(link);
          var group = options.group;
          if (group) {
            $from = $('[href^="#"][data-target-group="'+group+'"]');
            $to = (function () {
              var arr = [];
              $from.each(function (i, el) {
                var href = $(el).attr('href');

                if (href !== '#') {
                  arr.push($(href)[0]);
                }
              });

              return $(arr)
            }());
          }

          if ($('#'+id).is('.target') && options.toggle === true) {
            $to.removeClass('target');
            $from.removeClass('target-from');
            return;
          } else {

            $to.removeClass('target');
            $('#'+id).addClass('target');

            $from.removeClass('target-from');
            $link.addClass('target-from');
          }

          $link.trigger('target');

          // scrollTo
          if (options.scroll !== false) {
            console.log('scroll');

            setTimeout(function () {
              $(options.scrollparentselector).scrollTo($('#'+id), options.scroll && options.scrollduration, {offset: {left: 0, top:0}});
            },0 );
            //$link.trigger('targetscroll');
          }

        }
        window.target = target;

        // Trap anchors
        $(document).delegate('a[href^="#"]', 'click', function (e) {
          console.log('trap anchor');
          e.preventDefault();

          var $link = $(e.currentTarget);

          var options = {};

          if ($link.data('target-toggle') === false) {
            options.toggle = false;
          }

          if (!!$link.data('target-scroll') === true) {
            options.scroll = true;
          }

          if ($link.data('target-scroll-parentselector')) {
            options.scrollparentselector = $link.data('target-scroll-parentselector');
          }

          var targetgroup = $link.data('target-group');
          if (targetgroup) {
            options.group = targetgroup;
          }

          var href = $link.attr('href');
          if (href === '#' && options.group) {
            var $froms = $('[data-target-group="'+options.group+'"]');
            var $targetFrom = $froms.filter('.target-from').eq(0);
            if ($targetFrom.length >= 1) {
              href = $targetFrom.attr('href');
            } else {
              href = $froms.get().map(function (el) {return $(el).attr('href')}).filter(function (el) {return el !== '#'})[0];
            }
          }
          var $target = $(href).eq(0);

          if (!$target.length) return;
          //console.log('anchor target');

          target($target.attr('id'), $link, options);
        }.bind(this));
        
        $(window).on('hashchange', function (e) {
          console.log('hashchange');

          var hash = require('url').parse(e.originalEvent.newURL).hash;
          if (hash.length < 2) return;

          var id = hash.substr(1);
          target(id);
        });
        $(document).ready(function () {
          var hash = document.location.hash;
          if (hash.length < 2) return;

          var id = hash.substr(1);
          target(id);
          document.location.hash = "#";
        })
      }).call(this);

      // Configure {@url} dust helper
      dust.helpers.url.md5 = options.url.md5;
      dust.helpers.url.hosts = options.url.hosts;
      dust.helpers.url.baseUrl = function () {return window.location.href;};
      
    },
    routes: {
      '(/)auth': 'auth',
      '(/)quiz/:id': 'quiz'
    },
    auth: function () {
      console.log('auth');

      this.mainView = new AuthView({el: 'html'});
    },
    quiz: function () {
      console.log('quiz');

      this.mainView = new QuizView({el: 'html'});
    }
});

this.Wwwapp = Router;
if (typeof module !== "undefined" && module !== null) {
  module.exports = this.Wwwapp;
}