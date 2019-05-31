const got = require('got');

const host =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://now-next-pwa.ragingwind.now.sh';
const ep = (pathname, query) =>
  `${host}/${pathname}${query ? query : ''}`;
const qs = params =>
  Object.keys(params)
    .map(k => `${k}=${params[k]}`)
    .join('&');

const opts = {
  headers: {
    Authorization: `Bearer ${process.env.KEY}`
  },
  timeout: false
};

const get = async (pathname, query) => {
  const res = await got.get(ep(pathname, query), {
    ...opts,
    responseType: 'json'
  });

  return JSON.parse(res.body);
};

const post = async (subpath, body) => {
  const res = await got.post(ep(subpath), {
    ...opts,
    body: body
  });

  return JSON.parse(res.body);
};

(async () => {
  const deployments = await get('deployments');
  console.log('deployments', deployments);

  const project = Object.values(deployments)[0];

  const config = await post(
    'download',
    JSON.stringify({
      uid: project.uid
    })
  );

  console.log('download', config);

  const res = await post(
    'deploy',
    JSON.stringify({
      config
    })
  );

  console.log('deploy', res);
})();
