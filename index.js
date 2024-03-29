const { withUiHook, htm } = require('@zeit/integration-utils');
const { distanceInWordsToNow } = require('date-fns');
const fse = require('fs-extra');

const nc = require('./lib/nc');
const patch = require('./lib/patch');

const { HOST = 'http://localhost:5005' } = process.env;
const ASSETS_LINK_URL = `${HOST}/assets/link.png`;

const Deployment = ({
	uid,
	name,
	state,
	url,
	created,
	user
}) => {
	const projectURL = `https://${url}`;
	const deployURL = `https://zeit.co/${user.username}/${name}`;
	const pwaAction = `pwa-${uid}`;

	return htm`
	<Fieldset>
		<FsContent>
			<Box color="#000" fontSize="30px" fontWeight="600" marginBottom="10px">
				${name}<Link href=${deployURL} target="_blank"><Img src=${ASSETS_LINK_URL} height="13" width="13" /></Link>
			</Box>
			<Box display="flex" justifyContent="space-between" marginBottom="10px">
				<Box display="flex" alignItems="center" marginBottom="30px">
					<Box color="#067df7"><Link href=${projectURL} target="_blank">${url}</Link></Box>
				</Box>
			</Box>
			<Box display="flex" justifyContent="space-between" alignItems="end">
				<Box display="flex">
					<B>${state}</B>, Deployed ${distanceInWordsToNow(new Date(created))} ago
				</Box>
				<Box display="flex">
					<Button action=${pwaAction} highlight>Make as a PWA</Button>
				</Box>
			</Box>
		</FsContent>
	</Fieldset>
		`;
};

const ResultWithNotice = (type, message, res, user) => {
	const projectURL = res ? 'https://' + res.url : '';
	const deployId = res.url.split('-')[1].split('.')[0];
	const deployURL = `https://zeit.co/${user.username}/${res.name}/${deployId}`;

	return htm`
		<Page>
			<Notice type="${type}">${message}</Notice>
			${res &&
				htm`
				<Fieldset>
					<FsContent>
						<Box color="#000" fontSize="30px" fontWeight="600" marginBottom="10px">
							${res.name}
						</Box>
						<Box display="flex" justifyContent="space-between" marginBottom="10px">
							<Box display="flex" alignItems="center" marginBottom="30px">
								<Box color="#067df7">
									<Link href="${projectURL}" target="_blank">${projectURL}</Link>
									<Link href=${deployURL} target="_blank"><Img src=${ASSETS_LINK_URL} height="13" width="13" /></Link>
								</Box>
							</Box>
						</Box>
						<Box display="flex" justifyContent="space-between" marginBottom="10px">
							<Box display="flex" alignItems="right">
								<B>${res.readyState}</B>, Deployed ${distanceInWordsToNow(
					new Date(res.createdAt)
				)} ago
							</Box>
						</Box>
					</FsContent>
				</Fieldset>`}
		</Page>`;
};

module.exports = withUiHook(async ({ payload }) => {
	const { action, user, token } = payload;
	const client = nc.create({ key: token });

	if (action.startsWith('pwa-')) {
		const uid = action.split('-')[1];
		const dest = `/tmp/out/${new Date().getTime()}/${uid}`;
		const { src } = await client.getFiles(uid);

		try {
			await client.downloadFiles(uid, src, dest);

			const files = [...patch(dest), ...await client.uploadFiles(dest)];
			const config = {
				...JSON.parse(await fse.readFile(`${dest}/now.json`)),
				files
			}

			const res = await client.createDeployment(config);
			return ResultWithNotice('success', 'Deployed your project as a PWA', res, user);
		} catch (e) {
			return ResultWithNotice('error', e.toString());
		}
	}

	await client.getDeployments();

	return htm`
		<Page>
			<Container>
				<H1>Deployments from your projects</H1>
			</Container>
			<Container>
				${Object.values(client.deployments).map(deployment =>
					Deployment({
						user: user,
						...deployment
					})
				)}
			</Container>
		</Page>
	`;
});
