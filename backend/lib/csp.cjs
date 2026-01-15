const helmet = require("helmet");

module.exports = function installCsp(app) {
  const isProd = process.env.NODE_ENV === "production";

  app.use((req, res, next) => {
    const nonce = res.locals.cspNonce;

    if (!isProd) {
      return helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: "no-referrer-when-downgrade" },
        noSniff: true,
        permittedCrossDomainPolicies: true,
      })(req, res, next);
    }

    const directives = {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "object-src": ["'none'"],

      "script-src": [
        "'self'",
        `'nonce-${nonce}'`,
        "blob:",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://sandbox.web.squarecdn.com",
        "https://web.squarecdn.com",
        "https://cdn.jsdelivr.net",
      ],

      "script-src-elem": [
        "'self'",
        `'nonce-${nonce}'`,
        "https://www.google.com",
        "https://www.gstatic.com",
      ],

      "connect-src": [
        "'self'",
        "https://*",
        "https://www.google.com",
        "https://www.gstatic.com",
      ],

      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
      ],

      "img-src": ["'self'", "data:", "https://*"],

      "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],

      "frame-src": [
        "'self'",
        "https://www.google.com",
        "https://*.squareup.com",
        "https://web.squarecdn.com",
      ],

      "trusted-types": ["nextjs", "next-script", "uw-inline"],
      "require-trusted-types-for": ["'script'"],
    };

    return helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives,
        reportOnly: true,
      },
      referrerPolicy: { policy: "no-referrer-when-downgrade" },
      noSniff: true,
      permittedCrossDomainPolicies: true,
    })(req, res, next);
  });
};
