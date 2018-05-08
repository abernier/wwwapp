er2JSON = function (er) {
  // http://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify#18391212
  var o = {};

  Object.getOwnPropertyNames(er).forEach(function (key) {
    o[key] = er[key];
  });

  return o;
}
httpErrCodes = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Request Entity Too Large",
  414: "Request-URI Too Long",
  415: "Unsupported Media Type",
  416: "Requested Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  444: "Connection Closed Without Response",
  451: "Unavailable For Legal Reasons",
  499: "Client Closed Request",

  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
  599: "Network Connect Timeout Error"
};

module.exports = function (er, req, res, next) {
  er = er2JSON(er);
  //console.log('error middleware', require('util').inspect(er));

  er.status || (er.status = 500); // default to 500
  res.status(er.status);

  // Default message if not set
  if (!er.message && er.status in httpErrCodes) {
    er.message = httpErrCodes[er.status];
  }

  res.format({
    html: function () {
      res.render('er', er);
    },
    json: function () {
      res.send(er);
    },
    text: function () {
      res.send(er.message);
    }
  });

  // default to plain-text
  //res.type('txt').send(er.message);
};