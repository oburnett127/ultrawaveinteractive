module.exports = function installCloudflareNormalization(app) {
  app.use((req, res, next) => {
    // ---------------------------------------------
    // ☁️ Real client IP (Cloudflare → proxy → Express)
    // ---------------------------------------------
    const cfIp = req.headers["cf-connecting-ip"];
    const xff = req.headers["x-forwarded-for"];

    req.realIp =
      cfIp ||
      (typeof xff === "string" && xff.split(",")[0].trim()) ||
      req.ip;

    // ---------------------------------------------
    // 🌐 Original protocol (https behind proxy)
    // ---------------------------------------------
    req.realProtocol =
      req.headers["x-forwarded-proto"] || req.protocol;

    // ---------------------------------------------
    // ☁️ Cloudflare metadata (optional)
    // ---------------------------------------------
    req.cf = {
      ray: req.headers["cf-ray"],
      country: req.headers["cf-ipcountry"],
      colo: req.headers["cf-colo"],
    };

    next();
  });
};
