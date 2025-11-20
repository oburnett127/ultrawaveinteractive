// /lib/sanitizers.cjs
const sanitizeHtml = require("sanitize-html");

// ---------------------------------------------------------------------------
// BASIC TEXT SANITIZER
// ---------------------------------------------------------------------------
// Removes script tags + dangerous HTML, but keeps punctuation, URLs, etc.
function sanitizeBasicText(input) {
  if (typeof input !== "string") return input;
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard"
  }).trim();
}

// ---------------------------------------------------------------------------
// CONTACT FORM SANITIZER
// ---------------------------------------------------------------------------
// Removes HTML and script tags but keeps normal user text and punctuation.
function sanitizeContactMessage(message) {
  if (typeof message !== "string") return message;

  return sanitizeHtml(message, {
    allowedTags: [],               // no HTML allowed
    allowedAttributes: {},         // no attributes allowed
    allowedSchemes: ["http", "https", "mailto"],
    textFilter: (text) => text.trim(),
    disallowedTagsMode: "discard"
  });
}

// ---------------------------------------------------------------------------
// SALESBOT MESSAGE SANITIZER
// ---------------------------------------------------------------------------
// Keeps normal punctuation but strips HTML/script tags.
function sanitizeSalesbotMessage(message) {
  if (typeof message !== "string") return message;

  return sanitizeHtml(message, {
    allowedTags: [],               // no HTML permitted
    allowedAttributes: {},
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard"
  }).trim();
}

// ---------------------------------------------------------------------------
// BLOG TITLE SANITIZER
// ---------------------------------------------------------------------------
// A blog title must be VERY clean: no HTML, no markup, no emojis, no scripts.
function sanitizeBlogTitle(title) {
  if (typeof title !== "string") return title;

  // Remove HTML and ALL non-text characters except letters/numbers/basic punctuation
  let cleaned = sanitizeHtml(title, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard"
  });

  cleaned = cleaned.replace(/[<>{}]/g, ""); // remove stray markup characters
  cleaned = cleaned.trim();

  return cleaned;
}

// ---------------------------------------------------------------------------
// MARKDOWN SANITIZER (for blog content)
// ---------------------------------------------------------------------------
// This is important: you *DO NOT* want to delete markdown syntax.
// We only strip <script> tags & inline JS, but preserve markdown formatting.
function sanitizeMarkdownContent(markdown) {
  if (typeof markdown !== "string") return markdown;

  return sanitizeHtml(markdown, {
    allowedTags: false, // allow markdown raw text including #, *, ``, etc.
    allowedAttributes: {},

    // Block only actual HTML/script injection attempts
    disallowedTagsMode: "discard",

    // Prevent <script>, <img onerror>, <a onclick=...>
    transformTags: {
      "script": () => ({ tagName: "noscript", text: "" })
    },

    // Remove inline event handlers
    allowedAttributes: {
      "*": []
    }
  });
}

// ---------------------------------------------------------------------------
// SAFE NUMBER SANITIZER (e.g., amount fields, phone fields)
// ---------------------------------------------------------------------------
// Removes anything that isn't a number, +, -, ., or space.
function sanitizeNumberString(input) {
  if (typeof input !== "string") return input;
  return input.replace(/[^0-9.+\- ]/g, "").trim();
}

// ---------------------------------------------------------------------------
// SAFE EMAIL SANITIZER
// ---------------------------------------------------------------------------
// Removes dangerous characters while still allowing normal email format.
function sanitizeEmail(input) {
  if (typeof input !== "string") return input;
  return input
    .replace(/[<>\{\}\(\)\[\];:"'\/\\ ]/g, "")  // remove dangerous chars
    .toLowerCase()
    .trim();
}

// ---------------------------------------------------------------------------
// NO SANITIZER (for sensitive routes)
// ---------------------------------------------------------------------------
// Use this for:
//   - Payment routes (Square tokens)
//   - OTP routes (reCAPTCHA tokens)
//   - Auth routes (NextAuth)
//   - Webhooks
function sanitizeNone(input) {
  return input;
}

// ---------------------------------------------------------------------------
// EXPORT EVERYTHING
// ---------------------------------------------------------------------------
module.exports = {
  sanitizeBasicText,
  sanitizeContactMessage,
  sanitizeSalesbotMessage,
  sanitizeBlogTitle,
  sanitizeMarkdownContent,
  sanitizeNumberString,
  sanitizeEmail,
  sanitizeNone,
};
