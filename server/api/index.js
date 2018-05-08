var express = require('express');
var app = express.Router();

//
// session
//

var sessions = require('./sessions');

app.put('/sessions/valid', sessions.validate);
//app.get('/sessions/new', sessions.new);
app.post('/sessions', sessions.create);
app.get('/session', sessions.show);
app.delete('/session', sessions.destroy);

//
// signin
//

var redis = require('../redis');
app.redis = redis;
var tokens = require('./tokens');
//app.get('/tokens/new', tokens.new);
app.get('/tokens/:token([a-zA-Z0-9_-]{40})', redis.isReady, tokens.show);
app.post('/tokens', redis.isReady, tokens.create);

//
// Facebook connect
//

var passport = require('passport');

var facebookCallback = require('./passport-oauthcallback').facebook;
app.get('/sessions/facebook', function (req, res, next) {
  req.session.next = req.query.next;

  next();
}, passport.authenticate('facebook', {/*authType: 'rerequest', */scope: ['email']}));
app.get('/sessions/facebook/callback', passport.authenticate('facebook', {failureRedirect: '/auth'}), facebookCallback);

//
// Google connect
//

var passport = require('passport');

var googleCallback = require('./passport-oauthcallback').google;
app.get('/sessions/google', function (req, res, next) {
  req.session.next = req.query.next;

  next();
}, passport.authenticate('google'));
app.get('/sessions/google/callback', passport.authenticate('google', {failureRedirect: '/auth'}), googleCallback);

//
// Users
//

var users = require('./users');

app.head('/users', users.exist);
app.head('/users/:id', users.exist);

//app.get('/users', users.index);

app.put('/users/valid', users.validate);
app.put('/users/:id/valid', users.validate);

//app.get('/users/new', users.new);
app.get('/users/:id', users.show);
app.post('/users', users.create);

//app.get('/users/:id/edit', users.edit);
//app.post('/users/:id/edit', users.update);
app.put('/users/:id', users.update);
app.delete('/users/:id', users.destroy);

module.exports = app;