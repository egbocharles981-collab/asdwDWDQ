// Shim: forward to root `route.js` so deployments that run code from `src/` use the canonical routes
module.exports = require('../route');
