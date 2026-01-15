const crypto = require("crypto");

module.exports = function installCspNonce(app) {
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    next();
  });
};
