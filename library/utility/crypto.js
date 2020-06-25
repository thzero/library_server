// import cryptoJS from 'crypto-js'

//crypto-js
// export class CryptoAes {
// 	static encrypt(text, key) {
// 		return cryptoJS.AES.encrypt(text, key).toString()
// 	}

// 	static decrypt(input, key) {
// 		const bytes  = cryptoJS.AES.decrypt(input, key)
// 		const originalText = bytes.toString(cryptoJS.enc.Utf8)
// 		return originalText
// 	}
// }

class CryptoUtility {
	static async checksum(input, algorithm) {
		// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign#HMAC
		const msgUint8 = new TextEncoder().encode(input) // encode as (utf-8) Uint8Array
		const hashBuffer = await crypto.subtle.digest(algorithm || 'SHA-256', msgUint8) // hash the message
		return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('') // convert bytes to hex string
	}
}

export default CryptoUtility
