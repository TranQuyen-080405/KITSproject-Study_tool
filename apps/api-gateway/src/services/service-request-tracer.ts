import {
  finishApiCall,
  startApiCall,
  type ApiCallTrace,
} from "./api-call-trace-store.js";

type ServiceName = Extract<ApiCallTrace["service"], "User" | "Content" | "Learning" | "Analytics">;

export async function fetchService(
  service: ServiceName,
  target: string,
  parentId: string | undefined,
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(target);
  const trace = startApiCall({
    parentId,
    kind: "service",
    service,
    method: init?.method ?? "GET",
    path: url.pathname + url.search,
    target: url.origin,
  });

  try {
    const response = await fetch(target, init);
    finishApiCall(trace, { status: response.status });
    return response;
  } catch {
    finishApiCall(trace, { status: 502, error: `${service} Service is unavailable.` });
    throw new Error(`${service} Service is unavailable.`);
  }
}
