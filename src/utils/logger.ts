/**
 * Sistema de logging estruturado para Vanguard Veterinary
 * Formato: [TIMESTAMP] [LEVEL] [MODULE] message
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const COLORS = {
  DEBUG: '\x1b[36m',    // Cyan
  INFO: '\x1b[32m',     // Green
  WARN: '\x1b[33m',     // Yellow
  ERROR: '\x1b[31m',    // Red
  RESET: '\x1b[0m',
};

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, moduleName: string, message: string): string {
  const timestamp = formatTimestamp();
  const color = COLORS[level];
  const reset = COLORS.RESET;
  
  // Em produção, não usar cores
  if (import.meta.env.PROD) {
    return `[${timestamp}] [${level}] [${moduleName}] ${message}`;
  }
  
  return `${color}[${timestamp}] [${level}] [${moduleName}]${reset} ${message}`;
}

function shouldLog(level: LogLevel): boolean {
  // Em produção, não logar DEBUG
  if (import.meta.env.PROD && level === 'DEBUG') {
    return false;
  }
  return true;
}

export function createLogger(moduleName: string): Logger {
  return {
    debug: (message: string, ...args: unknown[]) => {
      if (!shouldLog('DEBUG')) return;
      const formatted = formatMessage('DEBUG', moduleName, message);
      console.log(formatted, ...args);
    },

    info: (message: string, ...args: unknown[]) => {
      if (!shouldLog('INFO')) return;
      const formatted = formatMessage('INFO', moduleName, message);
      console.log(formatted, ...args);
    },

    warn: (message: string, ...args: unknown[]) => {
      if (!shouldLog('WARN')) return;
      const formatted = formatMessage('WARN', moduleName, message);
      console.warn(formatted, ...args);
    },

    error: (message: string, ...args: unknown[]) => {
      if (!shouldLog('ERROR')) return;
      const formatted = formatMessage('ERROR', moduleName, message);
      console.error(formatted, ...args);
    },
  };
}

// Logger global para uso rápido
export const logger = createLogger('global');