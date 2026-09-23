import os from 'os';

// The platform cannot change while the process runs. Each getter used to call
// os.type() and run its regexes on every access.
const type = os.type();
const isLinux = (/^linux/i.test(type) || /^freebsd/i.test(type) || /^darwin/i.test(type));
const isMac = (/^darwin/i.test(type));
const isWin = (/^win/i.test(type));

class OsUtility {
	static get isLinux() {
		return isLinux;
	}

	static get isMac() {
		return isMac;
	}

	static get isWin() {
		return isWin;
	}
}

export default OsUtility;
