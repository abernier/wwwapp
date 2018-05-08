var crypto = require('crypto');

function sha(s) {
	return crypto.createHash("sha1").update(s).digest("hex");
}

module.exports = sha;