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

type StoredAccount = { id: number; accessToken: string; [key: string]: unknown };
let pendingRefresh: Promise<string | undefined> | undefined;

function storedAccount(): StoredAccount | undefined {
  try {
    const account = JSON.parse(localStorage.getItem("haru-account") ?? "null");
    return typeof account?.id === "number" && typeof account?.accessToken === "string" ? account : undefined;
  } catch { return undefined; }
}
function notifySession(account?: StoredAccount) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haru-session-updated", { detail: account }));
}
async function refreshSession(account: StoredAccount): Promise<string | undefined> {
  if (!pendingRefresh) {
    pendingRefresh = (async () => {
      try {
        const response = await fetch("/api/v1/auth/refresh", {
          method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: "{}",
        });
        const current = storedAccount();
        // Do not restore a session after logout or overwrite an account switched in another tab.
        if (current?.id !== account.id || current.accessToken !== account.accessToken) return undefined;
        if (response.status === 401) {
          localStorage.removeItem("haru-account"); notifySession(); return undefined;
        }
        if (!response.ok) return undefined;
        const body = await response.json();
        if (typeof body.accessToken !== "string" || body.user?.id !== account.id) return undefined;
        const latest = storedAccount();
        if (latest?.id !== account.id || latest.accessToken !== account.accessToken) return undefined;
        const updated = { ...latest, ...body.user, accessToken: body.accessToken };
        localStorage.setItem("haru-account", JSON.stringify(updated)); notifySession(updated);
        return body.accessToken;
      } catch { return undefined; }
    })().finally(() => { pendingRefresh = undefined; });
  }
  return pendingRefresh;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set("content-type", "application/json");
  const privatePath = /^\/api\/v1\/(content|analytics|ai|users)(\/|$)/.test(path);
  const account = privatePath ? storedAccount() : undefined;
  const accessToken = options.accessToken ?? account?.accessToken;
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  const send = () => fetch(path, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers, credentials: "include",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  let response = await send();
  if (response.status === 401 && account && accessToken === account.accessToken) {
    const current = storedAccount();
    if (current?.id === account.id) {
      const nextToken = current.accessToken !== accessToken ? current.accessToken : await refreshSession(account);
      if (nextToken && storedAccount()?.id === account.id) {
        headers.set("authorization", `Bearer ${nextToken}`);
        response = await send();
      }
    }
  }
  if (response.status === 204) return undefined as T;
  if (!response.ok) {
    const { message, code } = await readErrorMessage(response, "Yêu cầu không thành công.");
    throw new ApiError(message, response.status, code);
  }
  return (await response.json()) as T;
}
