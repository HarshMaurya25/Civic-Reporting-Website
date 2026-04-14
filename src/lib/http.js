import { API_BASE_URL } from "../config/env";
import { clearSession, getToken } from "./session";

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await parseJsonSafe(response);

  if (response.status === 401) {
    clearSession();
    if (window.location.hash !== "#/login") {
      window.location.hash = "#/login";
    }
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    const message =
      (payload &&
        typeof payload === "object" &&
        (payload.message || payload.error)) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export function get(path) {
  return request(path, { method: "GET" });
}

export function post(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

export function put(path, body) {
  return request(path, { method: "PUT", body: JSON.stringify(body) });
}

export function del(path) {
  return request(path, { method: "DELETE" });
}
