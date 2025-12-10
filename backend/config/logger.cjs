const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../logs'); // __dirname is available in CommonJS

// Make sure the logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const env = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || 'info';

const fileRotateTransport = new DailyRotateFile({
  filename: `${logDir}/app-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '5m',
  maxFiles: '14d',
  level: logLevel,
});

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
    })
  ),
  transports: [new winston.transports.Console(), fileRotateTransport],
  exitOnError: false,
});

logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
