// Compatibility shim: re-export functions from the legacy controler.js
// Some deployments or older code reference '../controllers/candleController'
// This file forwards those imports to the existing `controler.js` at project root.

module.exports = require('../controler');
