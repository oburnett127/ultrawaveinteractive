// /routes/leads.route.cjs
const prisma = require("../lib/prisma.cjs");
const express = require('express');
const router = express.Router();

const SECRET_TOKEN = process.env.LEADS_API_TOKEN;

router.post("/leads", async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ Verify secret header in production
    if (process.env.NODE_ENV === "production") {
      const providedToken = req.headers["x-leads-api-key"];
      if (!providedToken || providedToken !== SECRET_TOKEN) {
        return res.status(403).json({ success: false, message: "Forbidden: Invalid API Key" });
      }
    }

    const {
      email,
      phone,
      name,
      company,
      projectDetails,
      estimatedBudget,
      timeline,
      source,
    } = req.body;

    const lead = await prisma.lead.create({
      data: {
        email,
        phone,
        name,
        company,
        projectDetails,
        estimatedBudget: estimatedBudget ? parseInt(estimatedBudget, 10) : null,
        timeline,
        source,
      },
    });

    return res.status(201).json({ success: true, lead });
  } catch (err) {
    console.error("❌ Lead creation error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;