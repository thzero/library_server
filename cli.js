import dayjs from 'dayjs';
import minimist from 'minimist';
import readline from 'readline';

import Utility from './utility';

// https://timber.io/blog/creating-a-real-world-cli-app-with-node/

const { version } = require('./package.json');
const appVersion = version;

function pad(width, string, padding) {
	return (width <= string.length) ? string : pad(width, padding + string, padding)
}

function question(q, acceptable) {
	const rl = readline.createInterface( {
		input: process.stdin,
		output: process.stdout
	} );

	rl.setPrompt(q);
	rl.prompt();

	return new Promise(( resolve , reject) => {
		let response;
		rl.on('line', (userInput) => {
			response = userInput;
			rl.close();
		});
		rl.on('close', () => {
			resolve(response === acceptable);
		});
	});
}

(async () => {
	const menus = {
		default: `
	cli <options>

	--generate :: generates a UUIDs, either in short (default) or long format
		--number, --n :: the number of ids to generate
		--long, --l :: generates a long uuid

	--updateversion :: updates the version
		--major, --ma :: sets the major version, defaults to the current value or 0
		--minor, --mi :: sets the minor version, defaults to the current value or 0
		--patch, --p :: sets the patch, defaults to the current value or 0
		--patch_inc, --pi :: increments the patch by one
		--date, --d :: sets the version date in MM/DD/YYYY format, defaults to current date
		--package, --pa :: sets the path of the package.json file`,
	};

	const args = minimist(process.argv.slice(2));

	let cmd = 'generate' || 'help';

	if (args.updateversion || args.uv)
		cmd = 'updateversion';

	if (args.version || args.v)
		cmd = 'version';

	if (args.help || args.h)
		cmd = 'help';

	let number = 1;
	if (args.number || args.n)
		number = args.number || args.n;

	let short = true;
	if (args.long || args.l)
		short = false;

	switch (cmd) {
		case 'generate':
			let result
			for (let i = 0; i < number; i++) {
				if (!short)
					result = Utility.generateLongId();
				else
					result = Utility.generateShortId();
				console.log(result);
			}
			break;

		case 'updateversion':
			let packagePath = './package.json';
			if (args.package || args.pa) {
				packagePath = args.package || args.pa;
				if (!packagePath)
					console.error('Invalid package path.');
			}

			const packageJson = require(packagePath);
			// console.log(packageJson);

			let major = Number(packageJson.version_major || 0);
			// console.log(`major: ${major}`);
			if ((args.major !== null && args.major !== undefined) || (args.ma !== null && args.ma !== undefined))
				major = args.new || args.ma;
			// console.log(`major.args: ${major}`);

			let minor = Number(packageJson.version_minor || 0);
			// console.log(`minor: ${minor}`);
			if ((args.minor !== null && args.minor !== undefined) || (args.mi !== null && args.mi !== undefined))
				minor = args.minor || args.mi;
			// console.log(`minor.args: ${minor}`);

			let patch = Number(packageJson.version_patch || 0);

			// console.log(`patch: ${patch}`);
			if ((args.patch !== null && args.patch !== undefined) || (args.p !== null && args.p !== undefined))
				patch = args.patch || args.p;
			// console.log(`patch.args: ${patch}`);

			// console.log(`patch: ${patch}`);
			if (args.patch_inc || args.pi)
				patch = patch + 1;
			// console.log(`patch.args: ${patch}`);

			let date = null;
			if (args.date || args.d)
				date = args.date || args.d;
			if (!date)
				date = dayjs().format('MM/DD/YYYY');

			const version = `${major}.${minor}.${patch}`;

			const value = await question(`Updating with version '${version}' and date '${date}'.\nDo you want to proceed? [y/n] `, 'y');
			if (!value) {
				console.log('No updates applied.');
				return;
			}

			packageJson.version = version;
			packageJson.version_major = major;
			packageJson.version_minor = minor;
			packageJson.version_patch = patch;
			packageJson.version_date = date;
			// console.log(packageJson);

			const output = JSON.stringify(packageJson, null, 2);
			// console.log(output);
			const fs = require('fs');
			fs.writeFile('./package.json', output, function (err) {
				if (err)
					return console.error(err);
				console.log(`Updated version with '${major}.${minor}.${patch}', '${date}'.`);
			});

			break;

		case 'help':
			// require('./cmds/help')(args)
			console.log(menus.default)
			break;

		case 'version':
			console.log(`v${appVersion}`)
			break;

		default:
			console.error(`"${cmd}" is not a valid command!`)
			break;
	}
})();
