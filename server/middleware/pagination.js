var qs = require('querystring');

//
// Pagination middleware
//
// Ex:
//
// http://example.com/foo?page=2&per_page=20
//
// <p class="paging">
//   {#pagination.prev}
//   <a rel="prev" href="?{.}">Prev</a>
//   {/pagination.prev}
// 
//   {#pagination.next}
//   <a rel="next" href="?{.}">Next</a>
//   {/pagination.next}
// </p>
//

function Pagination(page, perPage) {
  this.page = +page || 1;
  this.perPage = +perPage || 10;

  this.skip = this.perPage * (this.page - 1);
  this.total = undefined;
}
Pagination.prototype.prev = function () {
  var prevPage = this.page - 1;

  if (prevPage < 1) {
    return;
  }

  return 'page=' + prevPage;
};
Pagination.prototype.next = function () {
  var nextPage = this.page + 1;

  if ((typeof this.total !== 'undefined') && (nextPage - 1) * this.perPage >= this.total) {
    return;
  }

  return 'page=' + nextPage;
};

module.exports = function (req, res, next) {
  var pagination = new Pagination(req.query.page, req.query.per_page);

  req.pagination = pagination;
  res.locals._settings.pagination = pagination;
  res.locals._settings.query = req.query;
  res.locals._settings.querystring = qs.stringify(req.query)

  next();
};