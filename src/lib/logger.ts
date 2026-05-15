
/**
 * Logger Service for the application.
 * Handles logging to local storage and potentially to file in Electron.
 */

const LOG_STORAGE_KEY = 'pdv_system_logs';
const MAX_LOGS = 500;

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: any;
  user?: string;
  context?: string;
}

class Logger {
  private logs: LogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
      
      // If in Electron, we could also write to a file
      if ((window as any).electronAPI?.writeLog) {
        (window as any).electronAPI.writeLog(this.logs[this.logs.length - 1]);
      }
    } catch (e) {
      // Fallback if localStorage is full
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string, details?: any, context?: string) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      details,
      context,
      user: localStorage.getItem('pdv_current_user_id') || 'system'
    };

    console[level](`[${context || 'System'}] ${message}`, details || '');
    
    this.logs.push(entry);
    this.saveLogs();
  }

  info(message: string, details?: any, context?: string) {
    this.log('info', message, details, context);
  }

  warn(message: string, details?: any, context?: string) {
    this.log('warn', message, details, context);
  }

  error(message: string, details?: any, context?: string) {
    this.log('error', message, details, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem(LOG_STORAGE_KEY);
  }
}

export const logger = new Logger();
