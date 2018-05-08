var conf = require('../conf');
var Sequelize = require('sequelize');
var url = require('url');

var formattor = require('formattor');
function sqlog(query) {
	console.log(formattor(query, {method: 'sql'}));
}

// ssl: https://devcenter.heroku.com/articles/connecting-to-heroku-postgres-databases-from-outside-of-heroku#ssl
if (conf.postgres_ssl === "true") {
  conf.postgres_uri.search = '?sslmode=require';
}

var sequelize = new Sequelize(url.format(conf.postgres_uri), {
  // http://sequelize.readthedocs.org/en/latest/api/sequelize/#new-sequelizedatabase-usernamenull-passwordnull-options
  logging: sqlog,
  //timezone: '+00:00'
  dialect: 'postgres',
  dialectOptions: {
    ssl: (conf.postgres_ssl === "true" ? true : false)
  }
});

module.exports = sequelize;