const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const { fileURLToPath } = require('url');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, '../logs');

const env = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL;

const fileRotateTransport = new DailyRotateFile({
  filename: `${logDir}/app-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '5m',              // 🔁 Rotate when log file exceeds 5 megabytes
  maxFiles: '14d',            // 🧹 Keep logs for 14 days
  level: logLevel,
});

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
      const { timestamp, level, message, stack } = info;
      return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    fileRotateTransport,
  ],
  exitOnError: false,
});

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};
