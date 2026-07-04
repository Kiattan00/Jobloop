type TraceLevel = "error" | "info";

type TraceEvent = {
  data?: Record<string, unknown>;
  elapsedMs: number;
  level: TraceLevel;
  scope: string;
  step: string;
  traceId: string;
};

export type ServerTrace = {
  fail: (step: string, error: unknown, data?: Record<string, unknown>) => void;
  finish: (data?: Record<string, unknown>) => void;
  id: string;
  log: (step: string, data?: Record<string, unknown>) => void;
  scope: string;
};

function now() {
  return Date.now();
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ fallback: String(value) });
  }
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
    name: "UnknownError",
  };
}

function emit(event: TraceEvent) {
  const payload = {
    ...event,
    ...(event.data ? { data: event.data } : {}),
  };

  const line = `[jobloop-trace] ${safeStringify(payload)}`;
  if (event.level === "error") {
    console.error(line);
    return;
  }

  console.info(line);
}

export function createServerTrace(scope: string): ServerTrace {
  const startedAt = now();
  const traceId = `${scope}-${startedAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: traceId,
    scope,
    log(step, data) {
      emit({
        data,
        elapsedMs: now() - startedAt,
        level: "info",
        scope,
        step,
        traceId,
      });
    },
    fail(step, error, data) {
      emit({
        data: {
          ...data,
          error: formatError(error),
        },
        elapsedMs: now() - startedAt,
        level: "error",
        scope,
        step,
        traceId,
      });
    },
    finish(data) {
      emit({
        data,
        elapsedMs: now() - startedAt,
        level: "info",
        scope,
        step: "finished",
        traceId,
      });
    },
  };
}
