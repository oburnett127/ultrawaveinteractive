const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && typeof onPerfEntry === "function") {
    const {
      getCLS,
      getFID,
      getFCP,
      getLCP,
      getTTFB
    } = require("web-vitals");

    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
  }
};

module.exports = reportWebVitals;
