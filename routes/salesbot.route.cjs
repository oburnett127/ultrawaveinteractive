// /routes/salesbot.route.cjs
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const OpenAI = require("openai");
const { createRedisClient } = require("../lib/redisClient.cjs");
const prisma = require("../lib/prisma.cjs");
const { sendNewLeadEmail } = require("../lib/mailerlead.cjs");

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PREFIX = "salesbot:";
const REQUIRED_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "projectDetails",
  "estimatedBudget",
];

// ✅ System Prompt (Condensed for Token Efficiency)
const systemPrompt = `
You are Ultrawave Salesbot, a friendly lead-collection assistant for Ultrawave Interactive (https://ultrawaveinteractive.com), a U.S.-based web design agency.

🎯 Goal: Ask one question at a time to collect these fields:
1. Full Name (first + last)
2. Email
3. Phone
4. Company (optional)
5. Project Details (brief)
6. Estimated Budget (USD)
7. Timeline (optional)

📝 After each reply:
- Acknowledge the answer briefly
- Ask the next missing field
- Keep messages short and conversational
- No pressure or sales tactics
- Write at a 6th–8th grade reading level

✅ Rules:
- Validate data: email must look like email, phone must be numeric, name must be full name.
- If user refuses info: explain it's required for a quote and let them continue when ready.
- Simple service questions OK, but refer technical/pricing questions to human team.
- Stop asking when all required fields are collected:
  > “Thanks! I’ve sent this to our team. You’ll hear from us soon 👋”

🚫 Forbidden:
- No guarantees, contracts, pricing, or legal topics
- No technical code or instructions
- No unrelated services
`;

// ✅ OpenAI function to extract lead data from messages
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
      estimatedBudget: { type: "string", description: "Estimated budget" },
      timeline: { type: "string", description: "Project timeline" },
    },
  },
};

// 🔒 Rate limit: max 50 requests per hour per IP
const salesbotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests, please try again later.",
  },
});
router.use(salesbotLimiter);

// 🔧 Utilities
function isLeadComplete(lead) {
  return REQUIRED_FIELDS.every((field) => lead[field]);
}

async function getSession(sessionId, redis) {
  const key = `${PREFIX}${sessionId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

async function saveSession(sessionId, session, redis) {
  const key = `${PREFIX}${sessionId}`;
  await redis.set(key, JSON.stringify(session), {
    EX: 60 * 15, // 15 min TTL
  });
}

// 🧠 Main Route: POST /api/salesbot
module.exports = async function salesbotHandler(req, res) {
  try {
    const userMessage = req.body.message;
    const sessionId = req.ip || "default-session";

    // ✅ Ensure Redis is ready
    const redis = await createRedisClient();

    let session = await getSession(sessionId, redis);
    if (!session) {
      session = { messages: [], lead: {} };
    }

    session.updatedAt = Date.now();
    session.messages.push({ role: "user", content: userMessage });

    // 🔍 Use OpenAI Function Calling to extract fields
    const extractResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...session.messages,
      ],
      functions: [FUNCTION_DEFINITION],
      function_call: "auto",
    });

    const msg = extractResponse.choices[0].message;
    if (msg.function_call?.arguments) {
      const extracted = JSON.parse(msg.function_call.arguments);
      Object.entries(extracted).forEach(([field, value]) => {
        if (value && !session.lead[field]) session.lead[field] = value;
      });
    }

    // ✅ Save to DB and notify team if lead is completed
    if (isLeadComplete(session.lead)) {
      const savedLead = await prisma.lead.create({
        data: {
          name: session.lead.name,
          email: session.lead.email,
          phone: session.lead.phone,
          company: session.lead.company || null,
          projectDetails: session.lead.projectDetails,
          estimatedBudget: session.lead.estimatedBudget,
          timeline: session.lead.timeline || null,
        },
      });

      // 📧 Send email notification
      await sendNewLeadEmail(savedLead);

      const reply = `Awesome, thanks! I’ve sent this to our team. You’ll hear from us soon 👋`;
      session.messages.push({ role: "assistant", content: reply });

      await redis.del(`${PREFIX}${sessionId}`);

      return res.json({ reply, lead: session.lead, saved: true });
    }

    // 🔁 Otherwise, ask the next missing field
    const nextField = REQUIRED_FIELDS.find((f) => !session.lead[f]);

    const promptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...session.messages,
        {
          role: "system",
          content: `Ask for the "${nextField}" field next.`,
        },
      ],
      max_tokens: 100,
    });

    const reply = promptResponse.choices[0].message.content;
    session.messages.push({ role: "assistant", content: reply });

    await saveSession(sessionId, session, redis);
    res.json({ reply, lead: session.lead });
  } catch (err) {
    console.error("Salesbot Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
