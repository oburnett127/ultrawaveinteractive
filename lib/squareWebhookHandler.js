const verifySquareSignature = require("../verifySignature.js");

module.exports = (req, res) => {
  const signature = req.headers["x-square-hmacsha256"];
  const rawBody = req.body; // raw buffer from express.raw()

  if (!verifySquareSignature(signature, rawBody)) {
    console.warn("❌ Invalid Square webhook signature");
    return res.status(401).send("Unauthorized");
  }

  try {
    const event = JSON.parse(rawBody.toString());

    console.log("✅ Square webhook event verified:", event?.type);

    // Handle specific event types if needed
    if (event?.type === "payment.created") {
      const payment = event.data?.object?.payment;
      console.log("💵 Payment Info:", payment?.amount_money);
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("❌ Failed to parse webhook:", err);
    return res.status(400).send("Invalid JSON");
  }
};
