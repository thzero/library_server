import {networkInterfaces} from 'os';
import {gateway4async, gateway4sync, gateway6async, gateway6sync} from 'default-gateway';
import ip from 'ipaddr.js';

const gateways = {
	v4: { async: gateway4async, sync: gateway4sync },
	v6: { async: gateway6async, sync: gateway6sync }
};

function findIp(gateway) {
	const gatewayIp = ip.parse(gateway);

	// Look for the matching interface in all local interfaces.
	for (const addresses of Object.values(networkInterfaces())) {
		for (const {cidr} of addresses) {
			if (!cidr)
				continue;

			let net;
			try {
				net = ip.parseCIDR(cidr);
			}
			catch {
				continue;
			}

			if (net[0] && net[0].kind() === gatewayIp.kind() && gatewayIp.match(net)) {
				return net[0].toString();
			}
		}
	}
}

function findIpFallback(family) {
	const kind = family === 'v6' ? 'IPv6' : 'IPv4';
	for (const addresses of Object.values(networkInterfaces())) {
		for (const address of addresses) {
			if (address.internal)
				continue;
			// os reports family as 'IPv4'/'IPv6', or 4/6 on some Node 18 builds.
			if ((address.family !== kind) && (address.family !== Number(family.substring(1))))
				continue;
			if ((kind === 'IPv6') && address.address.toLowerCase().startsWith('fe80:'))
				continue;
			return address.address;
		}
	}
}

async function async(family) {
	try {
		const {gateway} = await gateways[family].async();
		const result = findIp(gateway);
		if (result)
			return result;
	} catch {}

	return findIpFallback(family);
}

function sync(family) {
	try {
		const {gateway} = gateways[family].sync();
		const result = findIp(gateway);
		if (result)
			return result;
	} catch {}

	return findIpFallback(family);
}

export async function internalIpV6() {
	return async('v6');
}

export async function internalIpV4() {
	return async('v4');
}

export function internalIpV6Sync() {
	return sync('v6');
}

export function internalIpV4Sync() {
	return sync('v4');
}
