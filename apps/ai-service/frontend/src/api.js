const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function api(path, userId, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "x-user-id": userId || "anonymous",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;
    try {
      const data = await response.json();
      message = data.detail || data.error || message;
    } catch {
      // Response does not contain JSON.
    }
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
}

export const health = () => api("/health", "anonymous");
