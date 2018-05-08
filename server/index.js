var App = require('./app')

var app = App()
app.start(function (er) {
  if (er) throw er;
});

module.exports = app.server