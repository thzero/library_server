import os from 'os';

class OsUtility {
	static get isLinux() {
		const type = os.type();
		return (/^linux/i.test(type) || /^freebsd/i.test(type) || /^darwin/i.test(type));
	}

	static get isMac() {
		const type = os.type();
		return (/^darwin/i.test(type));
	}

	static get isWin() {
		const type = os.type();
		return (/^win/i.test(type));
	}
}

export default OsUtility;
