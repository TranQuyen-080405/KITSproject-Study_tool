import type { Session, User } from "./types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

type Storage = { read(): Promise<Session | null>; write(value: Session | null): Promise<void> };
type Options = { method?: string; body?: unknown; auth?: boolean };

export function createClient(baseUrl: string, storage: Storage, platform: "android" | "web", fetcher: typeof fetch = fetch) {
  let session: Session | null = null;
  let refreshing: Promise<void> | undefined;
  let generation = 0;
  const listeners = new Set<(value: Session | null) => void>();

  async function setSession(value: Session | null) {
    await storage.write(value);
    session = value;
    listeners.forEach((listener) => listener(value));
  }

  async function raw<T>(path: string, options: Options = {}, token?: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetcher(`${baseUrl.replace(/\/$/, "")}${path}`, {
        method: options.method ?? (options.body === undefined ? "GET" : "POST"),
        credentials: platform === "web" ? "include" : "omit",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Client-Platform": platform,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      if (response.status === 204) return undefined as T;
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = body.error ?? body.detail;
        throw new ApiError(
          typeof error === "string" ? error : error?.message ?? body.message ?? `Request failed (${response.status}).`,
          response.status,
          typeof error === "object" ? error?.code : undefined,
        );
      }
      return body as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Cannot reach the server. Check your connection and that the mobile backend is running.", 0);
    } finally {
      clearTimeout(timer);
    }
  }

  async function refresh() {
    if (!session) throw new ApiError("Please sign in again.", 401);
    if (!refreshing) {
      const currentGeneration = generation;
      const refreshToken = session.refreshToken;
      refreshing = (async () => {
        try {
          const next = await raw<Session>("/api/v1/auth/refresh", { body: refreshToken ? { refreshToken } : {} });
          if (currentGeneration === generation) await setSession(next);
        } catch (error) {
          if (currentGeneration === generation && error instanceof ApiError && error.status === 401) {
            await setSession(null);
          }
          throw error;
        } finally {
          refreshing = undefined;
        }
      })();
    }
    await refreshing;
  }

  async function request<T>(path: string, options: Options = {}): Promise<T> {
    if (options.auth === false) return raw<T>(path, options);
    if (!session) throw new ApiError("Please sign in first.", 401);
    const accessToken = session.accessToken;
    const currentGeneration = generation;
    try {
      return await raw<T>(path, options, accessToken);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || currentGeneration !== generation) throw error;
      if (session?.accessToken === accessToken) await refresh();
      if (!session) throw new ApiError("Your session expired. Please sign in again.", 401);
      return raw<T>(path, options, session.accessToken);
    }
  }

  return {
    request,
    refresh,
    getSession: () => session,
    subscribe(listener: (value: Session | null) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async restore() {
      session = await storage.read();
      if (session) {
        const user = await request<User>("/api/v1/users/me");
        await setSession({ ...session!, user });
      }
      return session;
    },
    async signIn(path: string, body: unknown) {
      const value = await raw<Session>(path, { body });
      generation += 1;
      await setSession(value);
    },
    async signOut() {
      generation += 1;
      const refreshToken = session?.refreshToken;
      // Sign out locally immediately, even when the server is unavailable.
      await setSession(null);
      await raw("/api/v1/auth/logout", { body: refreshToken ? { refreshToken } : {} });
    },
  };
}
