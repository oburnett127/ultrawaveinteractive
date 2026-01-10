// backend/server.api.cjs
const express = require("express");
const app = express();

const squareWebhookRoute = require("./routes/squareWebhook.route.cjs");
// import other API routes

app.use(express.json());

app.use("/api/square/webhook", squareWebhookRoute);
// other routes...

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
});
