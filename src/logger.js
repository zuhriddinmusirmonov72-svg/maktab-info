import config from './config.js';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[config.app.logLevel] || LOG_LEVELS.info;

// Redact sensitive information
function redactSecrets(message) {
  if (typeof message !== 'string') return message;
  
  let redacted = message;
  
  // Redact tokens and API keys
  if (config.telegram.botToken) {
    redacted = redacted.replace(new RegExp(config.telegram.botToken, 'g'), '[REDACTED_TOKEN]');
  }
  if (config.ai.apiKey) {
    redacted = redacted.replace(new RegExp(config.ai.apiKey, 'g'), '[REDACTED_API_KEY]');
  }
  
  return redacted;
}

function formatMessage(level, ...args) {
  const timestamp = new Date().toISOString();
  const messages = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.message}\n${arg.stack}`;
    }
    if (typeof arg === 'object') {
      return JSON.stringify(arg, null, 2);
    }
    return String(arg);
  });
  
  const message = messages.join(' ');
  const redacted = redactSecrets(message);
  
  return `[${timestamp}] [${level.toUpperCase()}] ${redacted}`;
}

const logger = {
  debug(...args) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatMessage('debug', ...args));
    }
  },

  info(...args) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info(formatMessage('info', ...args));
    }
  },

  warn(...args) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', ...args));
    }
  },

  error(...args) {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(formatMessage('error', ...args));
    }
  },
};

export default logger;
