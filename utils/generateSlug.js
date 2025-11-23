// generateSlug.js
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .replace(/\s+/g, '-')         // replace spaces with hyphens
    .replace(/-+/g, '-');         // collapse multiple hyphens
}

module.exports = { generateSlug };
