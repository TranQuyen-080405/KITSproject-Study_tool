// Shared HTTP client for Gateway-routed requests.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
  userId?: string;
};

async function readErrorMessage(response: Response, fallback: string): Promise<{ message: string; code?: string }> {
  try {
    const body = (await response.json()) as {
      error?: string | { code?: string; message?: string };
      message?: string;
      detail?: string | { message?: string } | Array<{ msg?: string }>;
    };

    if (typeof body.error === "string") {
      return { message: body.error };
    }

    if (body.error && typeof body.error === "object") {
      return {
        message: body.error.message ?? fallback,
        code: body.error.code,
      };
    }

    if (typeof body.message === "string") {
      return { message: body.message };
    }

    if (typeof body.detail === "string") {
      return { message: body.detail };
    }

    if (Array.isArray(body.detail) && typeof body.detail[0]?.msg === "string") {
      return { message: body.detail[0].msg };
    }

    if (body.detail && !Array.isArray(body.detail) && typeof body.detail.message === "string") {
      return { message: body.detail.message };
    }
  } catch {
    // Keep the fallback when the body is not JSON.
  }

  return { message: fallback };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  if (options.accessToken) {
    headers.set("authorization", `Bearer ${options.accessToken}`);
  }

  if (options.userId) {
    headers.set("x-user-id", options.userId);
  }

  const response = await fetch(path, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers,
    credentials: "include",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const { message, code } = await readErrorMessage(response, "Yêu cầu không thành công.");
    throw new ApiError(message, response.status, code);
  }

  return (await response.json()) as T;
}
