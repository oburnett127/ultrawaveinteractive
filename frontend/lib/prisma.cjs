const { PrismaClient } = require("@prisma/client");

let prisma;

if (!global.__frontend_prisma) {
  global.__frontend_prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
  });
}

prisma = global.__frontend_prisma;

module.exports = prisma;
