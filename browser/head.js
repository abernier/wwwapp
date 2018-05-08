var modernizr = require('modernizr');
var svg4everybody = require('svg4everybody');
svg4everybody();

(function () {
  var html = document.querySelector('html');

  html.classList.add('js');
  html.classList.remove('no-js');

  //
  // Browsers sniffing
  //

  if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
    html.classList.add('firefox');
  }
  if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
    html.classList.add('safari');
  }
  if (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) {
    html.classList.add('ios');
  }

  //
  // wide/tall <html> class
  //

  // WW/WH
  var dims = (function () {
    var o = {
      WW: undefined,
      WH: undefined
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
        html.classList.remove('tall');
        html.classList.add('wide');
      } else {
        html.classList.remove('wide');
        html.classList.add('tall');
      }
    }
    setWWH();

    return o;
  }).call(this);
}).call(this);