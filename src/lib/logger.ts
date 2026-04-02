type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = Record<string, unknown>;

function write(level: LogLevel, message: string, payload?: LogPayload): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(payload ?? {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info: (message: string, payload?: LogPayload) => write('info', message, payload),
  warn: (message: string, payload?: LogPayload) => write('warn', message, payload),
  error: (message: string, payload?: LogPayload) => write('error', message, payload),
};

