export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  details?: unknown
}

class LoggerService {
  private logs: LogEntry[] = []
  private maxLogs = 500

  private createEntry(level: LogLevel, module: string, message: string, details?: unknown): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      module,
      message,
      details
    }
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
    return entry
  }

  debug(module: string, message: string, details?: unknown) {
    const entry = this.createEntry('DEBUG', module, message, details)
    console.debug(`[DEBUG][${module}] ${message}`, details ?? '')
    return entry
  }

  info(module: string, message: string, details?: unknown) {
    const entry = this.createEntry('INFO', module, message, details)
    console.info(`[INFO][${module}] ${message}`, details ?? '')
    return entry
  }

  warn(module: string, message: string, details?: unknown) {
    const entry = this.createEntry('WARN', module, message, details)
    console.warn(`[WARN][${module}] ${message}`, details ?? '')
    return entry
  }

  error(module: string, message: string, details?: unknown) {
    const entry = this.createEntry('ERROR', module, message, details)
    console.error(`[ERROR][${module}] ${message}`, details ?? '')
    return entry
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clear() {
    this.logs = []
  }
}

export const logger = new LoggerService()
