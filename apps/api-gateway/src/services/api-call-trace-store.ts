export type ApiCallTrace = {
  id: string;
  parentId?: string;
  kind: "browser" | "service";
  service: "Gateway" | "User" | "Content" | "Learning" | "Analytics";
  method: string;
  path: string;
  target?: string;
  startedAt: string;
  durationMs?: number;
  status?: number;
  error?: string;
};

const maxTraces = 200;
const traces: ApiCallTrace[] = [];

export function startApiCall(
  trace: Omit<ApiCallTrace, "id" | "startedAt">,
): ApiCallTrace {
  const entry: ApiCallTrace = {
    ...trace,
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
  };
  traces.unshift(entry);
  if (traces.length > maxTraces) traces.length = maxTraces;
  return entry;
}

export function finishApiCall(
  trace: ApiCallTrace,
  result: Pick<ApiCallTrace, "status" | "error">,
): void {
  trace.status = result.status;
  trace.error = result.error;
  trace.durationMs = Date.now() - new Date(trace.startedAt).getTime();
}

export function listApiCalls(): ApiCallTrace[] {
  return [...traces];
}

export function clearApiCalls(): void {
  traces.length = 0;
}
