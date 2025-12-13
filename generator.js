const crypto = require('crypto');

// Generate a 256-bit (32-byte) random secret
const secret = crypto.randomBytes(32).toString('hex');
console.log('Generated Secret:', secret);
