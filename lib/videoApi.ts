/**
 * Video API helper for future service split
 * When VIDEO_API_BASE is set, calls external service
 * Otherwise calls local API
 */
export async function videoApi(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = process.env.VIDEO_API_BASE || "";
  const url = baseUrl ? `${baseUrl}${path}` : path;

  const headers = new Headers(init?.headers);
  headers.set("X-Request-Origin", "main-site");

  return fetch(url, {
    ...init,
    headers,
  });
}

/**
 * Type-safe video API wrapper
 */
export async function videoApiJson<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await videoApi(path, init);

  if (!response.ok) {
    throw new Error(
      `Video API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
