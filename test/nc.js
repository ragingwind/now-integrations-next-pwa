const tempDirectory = require('temp-dir');
const nc = require('../lib/nc');

if (!process.env.KEY) {
  console.error('Get a access token from now');
  process.exit(-1);
}

(async () => {
  try {
    const client = nc.create({
      key: process.env.KEY
    });

    const projects = await client.getProjects();
    console.log(JSON.stringify(projects));

    const deployments = await client.getDeployments();
    console.log(JSON.stringify(deployments));

    const files = await client.getFiles(deployments['nextjs-pwa'].uid);
    console.log(JSON.stringify(files));

    const dest = `${tempDirectory}/out`;
    await client.downloadFiles(deployments['nextjs-pwa'].uid, files['src'], dest);

    const uploaded = await client.uploadFiles(dest);
    console.log(uploaded);

    const config = {
      name: 'nextjs-pwa',
      version: 2,
      builds: [{ src: 'package.json', use: '@now/next' }],
      files: uploaded
    };

    const res = await client.createDeployment(config);
    console.log(res);
  } catch (e) {
    console.log(e);
  }
})();
