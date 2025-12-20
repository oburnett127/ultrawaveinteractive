// /routes/salesbot.route.cjs
const express = require("express");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const OpenAI = require("openai");
const prisma = require("../lib/prisma.cjs");
const { createRedisClient } = require("../backend/lib/redisClient.cjs");
const { sendNewLeadEmail } = require("../lib/mailerlead.cjs");
// Add sanitizers
const {
  sanitizeSalesbotMessage,
  sanitizeBasicText,
  sanitizeEmail,
  sanitizeNumberString,
} = require("../lib/sanitizers.cjs");

const router = express.Router();

// -------- Config / Constants --------
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SESSION_TTL_SECONDS = 60 * 15; // 15 minutes

const PREFIX = "salesbot:";
const REQUIRED_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "projectDetails",
  "estimatedBudget",
];

// Fail fast if missing critical secrets (but don’t crash app)
if (!OPENAI_API_KEY) {
  console.error("[Salesbot] Missing OPENAI_API_KEY — route will return 503.");
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// -------- Body size limit --------
router.use(express.json({ limit: "32kb" }));

// -------- Rate limit --------
const salesbotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
router.use(salesbotLimiter);

// Add sanitization to lead coercion
function sanitizeLeadFields(lead) {
  const cleaned = { ...lead };

  if (cleaned.name)
    cleaned.name = sanitizeBasicText(String(cleaned.name));

  if (cleaned.email)
    cleaned.email = sanitizeEmail(String(cleaned.email));

  if (cleaned.phone)
    cleaned.phone = sanitizeNumberString(String(cleaned.phone));

  if (cleaned.company)
    cleaned.company = sanitizeBasicText(String(cleaned.company));

  if (cleaned.projectDetails)
    cleaned.projectDetails = sanitizeSalesbotMessage(String(cleaned.projectDetails));

  if (cleaned.estimatedBudget != null)
    cleaned.estimatedBudget = sanitizeNumberString(String(cleaned.estimatedBudget));

  if (cleaned.timeline)
    cleaned.timeline = sanitizeBasicText(String(cleaned.timeline));

  return cleaned;
}

// -------- Helpers --------
function isLeadComplete(lead) {
  return REQUIRED_FIELDS.every((field) => lead[field]);
}

function coerceLeadTypes(obj) {
  const lead = { ...obj };

  if (lead.estimatedBudget != null) {
    const n = parseInt(String(lead.estimatedBudget).replace(/[^\d]/g, ""), 10);
    lead.estimatedBudget = Number.isFinite(n) ? n : null;
  }

  if (lead.name) lead.name = String(lead.name).trim();
  if (lead.email) lead.email = String(lead.email).trim().toLowerCase();
  if (lead.phone) lead.phone = String(lead.phone).trim();
  if (lead.company) lead.company = String(lead.company).trim();
  if (lead.projectDetails) lead.projectDetails = String(lead.projectDetails).trim();
  if (lead.timeline) lead.timeline = String(lead.timeline).trim();

  return lead;
}

function basicLeadValidate(lead) {
  const emailOk = !lead.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
  const phoneOk = !lead.phone || /^[0-9+()\s\-]{7,20}$/.test(lead.phone);
  const nameOk = !lead.name || /\s/.test(lead.name);
  return emailOk && phoneOk && nameOk;
}

function getSessionKey(req) {
  const hdr = req.headers["x-session-id"];
  if (hdr && typeof hdr === "string" && hdr.length <= 128) return `${PREFIX}${hdr}`;

  const cookie = (req.headers.cookie || "").match(/sbid=([^;]+)/);
  if (cookie) return `${PREFIX}${cookie[1]}`;

  const ua = req.headers["user-agent"] || "";
  const base = `${req.ip || "0.0.0.0"}|${ua}`;
  const hash = crypto.createHash("sha256").update(base).digest("hex");
  return `${PREFIX}${hash}`;
}

async function getSession(redis, key) {
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : { messages: [], lead: {}, updatedAt: Date.now() };
}

async function saveSession(redis, key, session) {
  await redis.set(key, JSON.stringify(session), { EX: SESSION_TTL_SECONDS });
}

// OpenAI function for lead extraction
const FUNCTION_DEFINITION = {
  name: "extractLeadData",
  description: "Extracts valid lead data from the current user message",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Full name" },
      email: { type: "string", description: "Email address" },
      phone: { type: "string", description: "Phone number" },
      company: { type: "string", description: "Company name" },
      projectDetails: { type: "string", description: "Brief project description" },
      estimatedBudget: { type: "string", description: "Estimated budget (USD)" },
      timeline: { type: "string", description: "Project timeline" },
    },
  },
};

// System prompt
const systemPrompt = `
You are Ultrawave Salesbot, a friendly lead-collection assistant for a U.S.-based web design agency.
Goal: Collect these fields one at a time: name (first+last), email, phone, company (optional), projectDetails (brief), estimatedBudget (USD), timeline (optional).
Be short, warm, 6th–8th grade reading level. Validate basics: email looks like email, phone looks like phone, name includes first and last.
If the user refuses, say it's needed for a quote and continue when they're ready.
Stop when all required fields are collected and say: "Thanks! I’ve sent this to our team. You’ll hear from us soon 👋"
No promises, pricing, legal, or technical instructions.
`;

// -------- Helpers --------

// Add sanitization to lead coercion
function sanitizeLeadFields(lead) {
  const cleaned = { ...lead };

  if (cleaned.name)
    cleaned.name = sanitizeBasicText(String(cleaned.name));

  if (cleaned.email)
    cleaned.email = sanitizeEmail(String(cleaned.email));

  if (cleaned.phone)
    cleaned.phone = sanitizeNumberString(String(cleaned.phone));

  if (cleaned.company)
    cleaned.company = sanitizeBasicText(String(cleaned.company));

  if (cleaned.projectDetails)
    cleaned.projectDetails = sanitizeSalesbotMessage(String(cleaned.projectDetails));

  if (cleaned.estimatedBudget != null)
    cleaned.estimatedBudget = sanitizeNumberString(String(cleaned.estimatedBudget));

  if (cleaned.timeline)
    cleaned.timeline = sanitizeBasicText(String(cleaned.timeline));

  return cleaned;
}

function isLeadComplete(lead) {
  return REQUIRED_FIELDS.every((field) => lead[field]);
}

function coerceLeadTypes(obj) {
  const lead = { ...obj };

  if (lead.estimatedBudget != null) {
    const n = parseInt(String(lead.estimatedBudget).replace(/[^\d]/g, ""), 10);
    lead.estimatedBudget = Number.isFinite(n) ? n : null;
  }

  if (lead.name) lead.name = String(lead.name).trim();
  if (lead.email) lead.email = String(lead.email).trim().toLowerCase();
  if (lead.phone) lead.phone = String(lead.phone).trim();
  if (lead.company) lead.company = String(lead.company).trim();
  if (lead.projectDetails) lead.projectDetails = String(lead.projectDetails).trim();
  if (lead.timeline) lead.timeline = String(lead.timeline).trim();

  return lead;
}

function basicLeadValidate(lead) {
  const emailOk = !lead.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
  const phoneOk = !lead.phone || /^[0-9+()\s\-]{7,20}$/.test(lead.phone);
  const nameOk = !lead.name || /\s/.test(lead.name);
  return emailOk && phoneOk && nameOk;
}

function getSessionKey(req) {
  const hdr = req.headers["x-session-id"];
  if (hdr && typeof hdr === "string" && hdr.length <= 128) return `${PREFIX}${hdr}`;

  const cookie = (req.headers.cookie || "").match(/sbid=([^;]+)/);
  if (cookie) return `${PREFIX}${cookie[1]}`;

  const ua = req.headers["user-agent"] || "";
  const base = `${req.ip || "0.0.0.0"}|${ua}`;
  const hash = crypto.createHash("sha256").update(base).digest("hex");
  return `${PREFIX}${hash}`;
}

async function getSession(redis, key) {
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : { messages: [], lead: {}, updatedAt: Date.now() };
}

async function saveSession(redis, key, session) {
  await redis.set(key, JSON.stringify(session), { EX: SESSION_TTL_SECONDS });
}

// -------- Route --------
router.post("/salesbot", async (req, res) => {
  const started = Date.now();

  try {
    if (!OPENAI_API_KEY) {
      return res.status(503).json({ error: "AI service unavailable. Please try again later." });
    }

    // USER MESSAGE SANITIZATION
    const userMessage = req.body?.message
      ? sanitizeSalesbotMessage(String(req.body.message))
      : "";

    if (!userMessage || userMessage.length > 2000) {
      return res.status(400).json({ error: "Message is required and must be under 2000 characters." });
    }

    // Redis
    const redis = await createRedisClient().catch((e) => {
      console.error("[Salesbot] Redis connect error:", e.message);
      return null;
    });

    const sessionKey = getSessionKey(req);
    let session = redis
      ? await getSession(redis, sessionKey)
      : { messages: [], lead: {}, updatedAt: Date.now() };

    session.updatedAt = Date.now();
    session.messages.push({ role: "user", content: userMessage });

    // ---------- LLM extraction ----------
    let extracted = {};
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const extractResponse = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...session.messages],
        functions: [FUNCTION_DEFINITION],
        function_call: "auto",
        temperature: 0.2,
      }, { signal: controller.signal });

      clearTimeout(timeout);

      const msg = extractResponse.choices?.[0]?.message || {};
      if (msg.function_call?.arguments) {
        try {
          extracted = JSON.parse(msg.function_call.arguments);
        } catch {
          extracted = {};
        }
      }
    } catch (err) {
      console.error("[Salesbot] Extract error:", err);
      extracted = {};
    }

    // Merge extracted
    Object.entries(extracted).forEach(([k, v]) => {
      if (v && session.lead[k] == null) {
        session.lead[k] = v;
      }
    });

    // Coerce → sanitize → validate
    session.lead = coerceLeadTypes(session.lead);
    session.lead = sanitizeLeadFields(session.lead);

    // ---------- Complete lead ----------
    if (isLeadComplete(session.lead)) {
      let savedLead = null;

      try {
        savedLead = await prisma.lead.create({
          data: {
            name: session.lead.name,
            email: session.lead.email,
            phone: session.lead.phone,
            company: session.lead.company || null,
            projectDetails: session.lead.projectDetails,
            estimatedBudget: session.lead.estimatedBudget,
            timeline: session.lead.timeline || null,
            source: "salesbot",
          },
        });
      } catch (dbErr) {
        console.error("[Salesbot] Lead save error:", dbErr);
      }

      try {
        if (savedLead) await sendNewLeadEmail(savedLead);
      } catch (mailErr) {
        console.warn("[Salesbot] Lead email notify failed:", mailErr);
      }

      const reply = "Awesome, thanks! I’ve sent this to our team. You’ll hear from us soon 👋";
      session.messages.push({ role: "assistant", content: reply });

      if (redis) {
        await redis.del(sessionKey);
      }

      return res.status(200).json({
        ok: true,
        saved: Boolean(savedLead),
        reply,
        lead: session.lead,
        latency_ms: Date.now() - started,
      });
    }

    // ---------- Ask next field ----------
    const nextField = REQUIRED_FIELDS.find((f) => !session.lead[f]) || "projectDetails";

    let reply = "Could you share a bit more so I can help?";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const promptResponse = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...session.messages,
          { role: "system", content: `Ask for the "${nextField}" field next.` },
        ],
        max_tokens: 120,
        temperature: 0.4,
      }, { signal: controller.signal });

      clearTimeout(timeout);

      reply = promptResponse.choices?.[0]?.message?.content?.trim() || reply;
    } catch (err) {
      console.error("[Salesbot] Prompt error:", err);
    }

    session.messages.push({ role: "assistant", content: reply });

    if (redis) {
      await saveSession(redis, sessionKey, session);
    }

    return res.status(200).json({
      ok: true,
      reply,
      lead: session.lead,
      latency_ms: Date.now() - started,
    });

  } catch (err) {
    console.error("[Salesbot] Unhandled error:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;