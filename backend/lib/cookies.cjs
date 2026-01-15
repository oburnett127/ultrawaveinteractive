const cookieParser = require("cookie-parser");

module.exports = function installCookies(app) {
  app.use(cookieParser());
};
