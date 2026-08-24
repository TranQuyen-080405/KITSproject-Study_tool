const API_URL = import.meta.env.VITE_API_URL || "";

export async function api(path, userId, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "x-user-id": userId || "anonymous",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Failed to fetch — không kết nối được AI API. Kiểm tra ai-service đang chạy, hoặc mở UI qua đúng host (localhost/127.0.0.1).",
    );
  }

  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") message = data.detail;
      else if (Array.isArray(data.detail)) {
        message = data.detail.map((item) => item.msg || JSON.stringify(item)).join("; ");
      } else if (data.error) {
        message = typeof data.error === "string" ? data.error : data.error.message || message;
      }
    } catch {
      // keep fallback
    }
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
}

export const health = (userId = "anonymous") => api("/health", userId);
