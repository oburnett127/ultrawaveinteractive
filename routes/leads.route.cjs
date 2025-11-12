const express = require("express");
const prisma = require("../lib/prisma.cjs");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
const crypto = require("crypto");

const router = express.Router();

const SECRET_TOKEN = process.env.LEADS_API_TOKEN;

// --- Rate limiter: 20 leads per hour per IP ---
const leadsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many submissions. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Limit payload size ---
router.use(express.json({ limit: "100kb" }));

// --- POST /api/leads ---
router.post("/leads", leadsLimiter, async (req, res) => {
  const startTime = Date.now();

  try {
    // --- 1️⃣ Enforce method (redundant but defensive) ---
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method Not Allowed" });
    }

    // --- 2️⃣ Verify API Key in production ---
    if (process.env.NODE_ENV === "production") {
      const providedToken = req.headers["x-leads-api-key"];
      const expectedToken = SECRET_TOKEN;

      if (!providedToken || !expectedToken) {
        return res.status(403).json({ success: false, message: "Forbidden: Missing API Key" });
      }

      // Constant-time comparison to avoid timing attacks
      const tokensMatch =
        providedToken.length === expectedToken.length &&
        crypto.timingSafeEqual(
          Buffer.from(providedToken, "utf8"),
          Buffer.from(expectedToken, "utf8")
        );

      if (!tokensMatch) {
        console.warn("[LeadsRoute] ⚠️ Invalid API key attempt.");
        return res.status(403).json({ success: false, message: "Forbidden: Invalid API Key" });
      }
    }

    // --- 3️⃣ Extract and validate body ---
    const {
      email,
      phone,
      name,
      company,
      projectDetails,
      estimatedBudget,
      timeline,
      source,
    } = req.body || {};

    // Basic required fields
    if (!email && !phone && !name) {
      return res.status(400).json({
        success: false,
        message: "At least one of name, email, or phone is required.",
      });
    }

    // Validate email
    const safeEmail = email && validator.isEmail(email) ? validator.normalizeEmail(email) : null;
    if (email && !safeEmail) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    // Sanitize strings
    const safeName = name ? validator.escape(name.trim()) : null;
    const safeCompany = company ? validator.escape(company.trim()) : null;
    const safeProject = projectDetails ? validator.escape(projectDetails.trim()) : null;
    const safeTimeline = timeline ? validator.escape(timeline.trim()) : null;
    const safeSource = source ? validator.escape(source.trim()) : null;

    // Validate and normalize phone number (optional)
    const safePhone =
      phone && validator.isMobilePhone(phone, "any") ? phone.trim() : null;

    // Handle estimated budget
    const budget =
      typeof estimatedBudget === "number"
        ? estimatedBudget
        : parseInt(estimatedBudget, 10);
    const safeBudget = !isNaN(budget) && budget > 0 ? budget : null;

    // --- 4️⃣ Insert lead into database ---
    const lead = await prisma.lead.create({
      data: {
        email: safeEmail,
        phone: safePhone,
        name: safeName,
        company: safeCompany,
        projectDetails: safeProject,
        estimatedBudget: safeBudget,
        timeline: safeTimeline,
        source: safeSource,
      },
    });

    console.info(`[LeadsRoute] ✅ New lead stored (ID: ${lead.id}) in ${Date.now() - startTime}ms`);

    return res.status(201).json({
      success: true,
      message: "Lead created successfully.",
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        createdAt: lead.createdAt,
      },
    });
  } catch (err) {
    console.error("[LeadsRoute] ❌ Lead creation error:", err);

    // Prisma unique constraint or validation errors
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry detected.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;
