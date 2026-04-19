type LogLevel = "debug" | "info" | "warn" | "error";

export type Logger = {
  child(bindings: Record<string, unknown>): Logger;
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
};

export function createLogger(scope: string, bindings: Record<string, unknown> = {}): Logger {
  const baseBindings = { scope, ...bindings };

  const log = (level: LogLevel, message: string, metadata: Record<string, unknown> = {}) => {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...baseBindings,
      ...metadata
    };

    const serialized = JSON.stringify(payload);
    if (level === "error") {
      console.error(serialized);
      return;
    }

    if (level === "warn") {
      console.warn(serialized);
      return;
    }

    console.log(serialized);
  };

  return {
    child(childBindings) {
      return createLogger(scope, { ...bindings, ...childBindings });
    },
    debug(message, metadata) {
      log("debug", message, metadata);
    },
    info(message, metadata) {
      log("info", message, metadata);
    },
    warn(message, metadata) {
      log("warn", message, metadata);
    },
    error(message, metadata) {
      log("error", message, metadata);
    }
  };
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: String(error)
  };
}

