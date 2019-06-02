const fse = require('fs-extra');
const { parse } = require('url');

const nc = require('./lib/nc');
const client = nc.create({});

const router = {
  deployments: async () => {
    const res = await client.getDeployments();
    return JSON.stringify(res);
  },
  download: async ({ uid }) => {
    const dest = `/tmp/out/${uid}`;
    const { src } = await client.getFiles(uid);
    let config = {};

    try {
      await client.downloadFiles(uid, src, dest);
      config = JSON.parse(await fse.readFile(`${dest}/now.json`));
      config.files = await client.uploadFiles(dest);
    } catch (e) {

    return JSON.stringify(config);
  },
  deploy: async({config}) => {
    const res = await client.createDeployment(config);
    return JSON.stringify(res);
  }
};

module.exports = async (req, res) => {
  const { pathname } = parse(req.url, true);
  const key = req.headers['authorization'].replace('Bearer ', '');
  const handler = router[pathname.slice(1)];

  if (key && handler) {
    client.key = key;
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => (body += chunk.toString()));
      req.on('end', async () => res.end(await handler(JSON.parse(body))));
    } else {
      res.end(await handler());
    }
  } else {
    res.writeHead(404);
    res.end();
  }
};
