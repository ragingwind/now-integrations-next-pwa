const { parse } = require('url');

module.exports = (req, res) => {
  const { pathname, query } = parse(req.url, true);
  console.log('GET redirection>', pathname, query)
  res.statusCode = 302;
  res.setHeader('Location', query.next || "/");
  res.end();
}