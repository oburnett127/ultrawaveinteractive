export function validatePassword(password, opts = {}) {
  const cfg = {
    minLength: 8,
    requireLetters: true,
    requireNumbers: true,
    requireUpper: false,
    requireLower: false,
    requireSymbols: false,
    maxLength: 1024,
    ...opts
  };
  const errors = [];
  if (typeof password !== "string" || password.length === 0) {
    errors.push("Password is required.");
    return { ok: false, errors };
  }
  if (password.length < cfg.minLength) errors.push(`Must be at least ${cfg.minLength} characters.`);
  if (password.length > cfg.maxLength) errors.push(`Must be at most ${cfg.maxLength} characters.`);
  if (cfg.requireLetters && !/[A-Za-z]/.test(password)) errors.push("Include at least one letter (a–z).");
  if (cfg.requireNumbers && !/\d/.test(password)) errors.push("Include at least one number (0–9).");
  if (cfg.requireUpper && !/[A-Z]/.test(password)) errors.push("Include at least one uppercase letter (A–Z).");
  if (cfg.requireLower && !/[a-z]/.test(password)) errors.push("Include at least one lowercase letter (a–z).");
  if (cfg.requireSymbols && !/[!@#$%^&*()_+\-={}[\]|:;\"'<>,.?/~`]/.test(password)) errors.push("Include at least one special character.");
  if (/^\s+$/.test(password)) errors.push("Password cannot be only whitespace.");
  return { ok: errors.length === 0, errors };
}
