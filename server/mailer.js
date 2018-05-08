var conf = require('../conf');

var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
var smtpTransport = require('nodemailer-smtp-transport');

var transporter;

if (conf.www_sendgrid_login && conf.www_sendgrid_password) {
  var options = {
    auth: {
      api_user: conf.www_sendgrid_login,
      api_key: conf.www_sendgrid_password
    }
  }
  transporter = nodemailer.createTransport(sgTransport(options));
} else {
  var url = require('url');
  var u = url.parse(url.format(conf.smtp_uri));
  //console.log(u);

  var smtpOptions = {
    host: u.hostname,
    port: u.port,
    secureConnection: (u.protocol === 'smtps:' ? true : false)
  };
  // auth
  if (u.auth) {
    var auth = u.auth.split(':');
    smtpOptions.auth = {
      user: auth[0],
      pass: auth[1]
    };
  }
  //console.log('smtpOptions', smtpOptions);

  transporter = nodemailer.createTransport(smtpTransport(smtpOptions));
}

module.exports = transporter;