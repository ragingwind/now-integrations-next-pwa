const { join, resolve } = require('path');
const fse = require('fs-extra');

const SWRegister = `<script dangerouslySetInnerHTML={{__html: \`navigator['serviceWorker'] && navigator.serviceWorker.register('/sw.js', {scope: '/' })\`}} />\n`;
const ManifestLink = `<link rel="manifest" href="/static/manifest.json" />\n`;

const readJSON = src => JSON.parse(fse.readFileSync(src));

const readText = src => fse.readFileSync(src).toString();

const updateDocument = (document, content = '') => {
	let head = document.indexOf('</Head>');
	if (head < 0) {
		throw new Errror('Document has no <Head>');
	}
	return document.slice(0, head) + content + document.slice(head);
};

const patchSW = dest => {
	const srcDocument = join(`${dest}`, 'pages/_document.js');
	const srcTemplage = join(resolve(__dirname, '../templates/_document.js'));
	const document = readText(
		fse.existsSync(srcDocument) ? srcDocument : srcTemplage
	);
	const noSWRegister = document.indexOf('navigator.serviceWorker.register') < 0;
	const noManifestLink = document.indexOf('<link rel="manifest') < 0;

	fse.writeFileSync(srcDocument, updateDocument(
		document,
		(noSWRegister && SWRegister) + (noManifestLink && ManifestLink)
	));
};

const addSW = dest => {
	const srcSW = join(resolve(__dirname, '../templates/sw.js'));
	const destSW = join(`${dest}`, 'static');

	fse.copyFileSync(srcSW, join(destSW, 'sw.js'));

	const srcNowConfig = join(`${dest}`, 'now.json');

	if (!fse.existsSync(srcNowConfig)) {
		throw new Error(`The project is not for now`);
	}

	const nowConfig = readJSON(srcNowConfig);

	if (!nowConfig.routes) {
		nowConfig.routes = [];
	}

	nowConfig.routes.push({ src: '/sw.js', dest: '/static/sw.js' });

	fse.writeFileSync(srcNowConfig, JSON.stringify(nowConfig, null, '\t'));
};

const addManifest = dest => {
	const pkg = readJSON(join(`${dest}`, 'package.json'));
	const now = readJSON(join(`${dest}`, 'now.json'));

	const manifest = {
		name: pkg.name || now.name || 'Nextjs PWA',
		short_name: pkg.name || now.name || 'Nextjs PWA',
		icons: [
			{
				src: '/static/icon-192x192.png',
				sizes: '192x192',
				type: 'image/png'
			},
			{
				src: '/static/icon-512x512.png',
				sizes: '512x512',
				type: 'image/png'
			}
		],
		start_url: '/',
		display: 'standalone',
		background_color: '#000000',
		theme_color: '#000000',
		orientation: 'portrait'
	};

	fse.writeFileSync(
		join(`${dest}`, 'static/manifest.json'),
		JSON.stringify(manifest, null, '\t')
	);
};

const addIcons = () => {
	const icon =
		'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';

	return ['192', '512'].map(size => {
		return {
			file: `/static/icon-${size}x${size}.png`,
			data: icon,
			encoding: 'base64'
		};
	});
};

function patch(dest) {
	fse.mkdirpSync(join(`${dest}`, 'static'));

	patchSW(dest);
	addSW(dest);
	addManifest(dest);
	return addIcons();
}

module.exports = patch;
