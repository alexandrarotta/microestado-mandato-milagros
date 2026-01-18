export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "";

function buildUrl(path: string) {
  if (!API_BASE) return path;
  if (API_BASE.endsWith("/") && path.startsWith("/")) {
    return `${API_BASE.slice(0, -1)}${path}`;
  }
  if (!API_BASE.endsWith("/") && !path.startsWith("/")) {
    return `${API_BASE}/${path}`;
  }
  return `${API_BASE}${path}`;
}

export class ApiError extends Error {
  status: number;
  url: string;
  body: string;

  constructor(message: string, status: number, url: string, body: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(
      message || `Request failed: ${response.status}`,
      response.status,
      response.url,
      message
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    console.error("API response was not JSON", {
      url: response.url,
      status: response.status,
      contentType,
      body: text
    });
    throw new ApiError(
      `Expected JSON but got ${contentType || "unknown"}`,
      response.status,
      response.url,
      text
    );
  }

  return (await response.json()) as T;
}
