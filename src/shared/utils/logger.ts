/**
 * Logger utility with colored console output for better terminal visibility
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

type LogLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "DEBUG";

interface LogContext {
  requestId?: string;
  userId?: string | number;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
}

class Logger {
  private getColor(level: LogLevel): string {
    switch (level) {
      case "INFO":
        return colors.blue;
      case "SUCCESS":
        return colors.green;
      case "WARNING":
        return colors.yellow;
      case "ERROR":
        return colors.red;
      case "DEBUG":
        return colors.cyan;
      default:
        return colors.reset;
    }
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().split("T")[1].split("Z")[0]; // HH:MM:SS.mmm
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.formatTimestamp();
    const color = this.getColor(level);
    const resetColor = colors.reset;

    let contextStr = "";
    if (context?.requestId) {
      contextStr += ` [${context.requestId}]`;
    }
    if (context?.method && context?.path) {
      contextStr += ` ${context.method} ${context.path}`;
    }
    if (context?.statusCode) {
      contextStr += ` ${context.statusCode}`;
    }
    if (context?.duration !== undefined) {
      contextStr += ` (${context.duration}ms)`;
    }
    if (context?.userId) {
      contextStr += ` [User: ${context.userId}]`;
    }

    return `${color}${colors.bright}[${timestamp}] [${level}]${resetColor}${contextStr} ${message}${resetColor}`;
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage("INFO", message, context));
  }

  success(message: string, context?: LogContext): void {
    console.log(this.formatMessage("SUCCESS", message, context));
  }

  warning(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("WARNING", message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = error ? `${message} — ${errorMessage}` : message;
    console.error(this.formatMessage("ERROR", fullMessage, context));

    if (error instanceof Error && error.stack) {
      console.error(`${colors.dim}${error.stack}${colors.reset}`);
    }
  }

  debug(message: string, context?: LogContext, data?: unknown): void {
    console.log(this.formatMessage("DEBUG", message, context));
    if (data !== undefined) {
      console.log(`${colors.dim}`, JSON.stringify(data, null, 2), colors.reset);
    }
  }

  http(message: string, method: string, path: string, statusCode: number, duration: number, requestId?: string): void {
    const context: LogContext = { method, path, statusCode, duration, requestId };
    const statusColor =
      statusCode >= 500
        ? colors.red
        : statusCode >= 400
          ? colors.yellow
          : statusCode >= 300
            ? colors.cyan
            : colors.green;
    const statusStr = `${statusColor}${statusCode}${colors.reset}`;
    console.log(
      `${colors.bright}[${this.formatTimestamp()}] [HTTP]${colors.reset} ${requestId ? `[${requestId}]` : ""} ${method} ${path} ${statusStr} (${duration}ms)`,
    );
  }
}

export const logger = new Logger();
