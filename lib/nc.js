const got = require('got');
const { statSync } = require('fs');
const fse = require('fs-extra');
const fs = require('fs');
const globby = require('globby');
const { sha1 } = require('crypto-hash');
const FormData = require('form-data');

const ep = subpath => `https://api.zeit.co/${subpath}`;

class NowClient {
	constructor(opts) {
		this.key = opts.key;
		this.deployments = {};
		this.files = {};
		this.projects = [];
	}

	async json(subpath, opts) {
		return JSON.parse(
			await this.get(subpath, {
				responseType: 'json',
				...opts
			})
		);
	}

	async get(subpath, opts = {}) {
		const { body } = await got(ep(subpath), {
			headers: {
				Authorization: `Bearer ${this.key}`
			},
			timeout: false,
			...opts
		});

		return body;
	}

	async post(subpath, body, opts = {}) {
		const { headers, ...rest } = opts;
		const res = await got.post(ep(subpath), {
			headers: {
				Authorization: `Bearer ${this.key}`,
				...headers
			},
			timeout: false,
			body: body,
			...rest
		});

		let json = {};

		try {
			json = JSON.parse(res.body);
		} catch (e) {}

		return json;
	}

	async getProjects() {
		this.projects = await this.json('v1/projects/list');

		return this.projects;
	}

	async getDeployments() {
		const res = await this.json('v4/now/deployments');

		res.deployments.forEach(r => {
			const dep = this.deployments[r.name];
			if (!dep || dep.created < r.created) {
				this.deployments[r.name] = r;
			}
		});

		return this.deployments;
	}

	async getFiles(id) {
		const res = await this.json(`v2/now/deployments/${id}/files`);

		res.forEach(r => (this.files[r.name] = r));

		return this.files;
	}

	async getFileContent(id, fid) {
		return this.get(`v5/now/deployments/${id}/files/${fid}`);
	}

	async writeFileContent(id, fid, dest) {
		return new Promise(resolve => {
			got
				.stream(ep(`v5/now/deployments/${id}/files/${fid}`), {
					headers: {
						Authorization: `Bearer ${this.key}`
					},
					timeout: false
				})
				.pipe(fs.createWriteStream(dest))
				.on('finish', () => {
					resolve(dest);
				});
		});
	}

	async downloadFiles(id, root, dest) {
		const download = async (children, dest) => {
			await fse.mkdirp(dest);

			while (children && children.length > 0) {
				const c = children.splice(0, 1)[0];

				if (c.type === 'directory') {
					await download(c.children, `${dest}/${c.name}`);
				} else if (c.type === 'file') {
					const filename = `${dest}/${c.name}`;
					await this.writeFileContent(id, c.uid, filename);
				}
			}
		};

		await download(root.children, dest);
	}

	async uploadFile(sha, content, conentType) {
		return await this.post('v2/now/files', content, {
			headers: {
				'x-now-digest': sha
			}
		});
	}

	async uploadFiles(dest) {
		const files = [];
		const targets = await globby(`${dest}/**/*`);
		const post = async target => {
			const content = await fse.readFile(target);
			const meta = {
				file: target.replace(`${dest}/`, ''),
				sha: await sha1(content.toString('utf8')),
				size: statSync(target).size
			};

			files.push(meta);
			return this.uploadFile(meta.sha, content.toString('utf8'));
		};

		const requests = [];
		targets.forEach(async file => {
			requests.push(post(file));
		});

		await Promise.all(requests);

		return files;
	}

	async createDeployment(config) {
		const res = await this.post('v9/now/deployments', JSON.stringify(config), {
			headers: {
				'Content-Type': 'application/json'
			}
		});

		return res;
	}
}

const createInstance = opts => {
	return new NowClient(opts || {});
};

module.exports.create = createInstance;
