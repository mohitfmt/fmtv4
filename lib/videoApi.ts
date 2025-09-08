// lib/videoApi.ts
/**
 * Enhanced video API utility with retry logic, timeouts, and better error handling
 */

interface ApiOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
  useCache?: boolean;
  cacheTTL?: number;
}

interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

class VideoApiError extends Error implements ApiError {
  status?: number;
  code?: string;
  details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = "VideoApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Simple in-memory cache for API responses
 */
class ApiCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set(key: string, data: any, ttl = 60000) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey ?? "");
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Create a shared cache instance
const apiCache = new ApiCache();

// Cleanup expired cache entries periodically
if (typeof window !== "undefined") {
  setInterval(() => apiCache.cleanup(), 60000); // Every minute
}

/**
 * Create a timeout signal
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * Merge abort signals
 */
function mergeSignals(
  signal1?: AbortSignal,
  signal2?: AbortSignal
): AbortSignal | undefined {
  if (!signal1 && !signal2) return undefined;
  if (!signal1) return signal2;
  if (!signal2) return signal1;

  const controller = new AbortController();

  const onAbort = () => controller.abort();
  signal1.addEventListener("abort", onAbort);
  signal2.addEventListener("abort", onAbort);

  return controller.signal;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main API function with enhanced features
 * Backward compatible with original videoApiJson
 */
export async function videoApiJson<T = any>(
  url: string,
  options: ApiOptions = {}
): Promise<T | null> {
  const {
    timeout = 10000, // 10 seconds default
    retries = 2,
    retryDelay = 1000,
    signal,
    useCache = false,
    cacheTTL = 60000,
    ...fetchOptions
  } = options;

  // Check cache if enabled
  if (useCache && fetchOptions.method === "GET") {
    const cacheKey = url;
    const cached = apiCache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create timeout signal
      const timeoutSignal = createTimeoutSignal(timeout);
      const combinedSignal = mergeSignals(signal, timeoutSignal);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: combinedSignal,
        headers: {
          "Content-Type": "application/json",
          ...fetchOptions.headers,
        },
      });

      // Handle different status codes
      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        let errorData;

        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = { message: errorBody };
        }

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new VideoApiError(
            errorData.error || errorData.message || `HTTP ${response.status}`,
            response.status,
            "CLIENT_ERROR",
            errorData
          );
        }

        // Retry on server errors (5xx)
        throw new VideoApiError(
          errorData.error || errorData.message || `HTTP ${response.status}`,
          response.status,
          "SERVER_ERROR",
          errorData
        );
      }

      // Parse response
      const data = await response.json();

      // Cache if enabled
      if (useCache && fetchOptions.method === "GET") {
        apiCache.set(url, data, cacheTTL);
      }

      return data;
    } catch (error: any) {
      lastError = error;

      // Don't retry on abort
      if (error.name === "AbortError") {
        console.warn(`[VideoAPI] Request aborted: ${url}`);
        return null;
      }

      // Don't retry on client errors
      if (
        error instanceof VideoApiError &&
        error.status &&
        error.status >= 400 &&
        error.status < 500
      ) {
        console.error(`[VideoAPI] Client error: ${error.message}`);
        throw error;
      }

      // Check if we've exhausted retries
      if (attempt === retries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      console.warn(
        `[VideoAPI] Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  // All retries exhausted
  console.error(`[VideoAPI] All retries exhausted for: ${url}`, lastError);

  if (lastError instanceof VideoApiError) {
    throw lastError;
  }

  // Return null instead of throwing for backward compatibility
  return null;
}

/**
 * Convenience method for GET requests
 */
export async function videoApiGet<T = any>(
  url: string,
  options?: Omit<ApiOptions, "method">
): Promise<T | null> {
  return videoApiJson<T>(url, { ...options, method: "GET" });
}

/**
 * Convenience method for POST requests
 */
export async function videoApiPost<T = any>(
  url: string,
  body?: any,
  options?: Omit<ApiOptions, "method" | "body">
): Promise<T | null> {
  return videoApiJson<T>(url, {
    ...options,
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/**
 * Convenience method for PUT requests
 */
export async function videoApiPut<T = any>(
  url: string,
  body?: any,
  options?: Omit<ApiOptions, "method" | "body">
): Promise<T | null> {
  return videoApiJson<T>(url, {
    ...options,
    method: "PUT",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function videoApiDelete<T = any>(
  url: string,
  options?: Omit<ApiOptions, "method">
): Promise<T | null> {
  return videoApiJson<T>(url, { ...options, method: "DELETE" });
}

/**
 * Batch API requests with concurrency control
 */
export async function batchApiRequests<T>(
  requests: Array<() => Promise<T>>,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<Array<{ success: boolean; data?: T; error?: Error }>> {
  const { concurrency = 3, onProgress } = options;
  const results: Array<{ success: boolean; data?: T; error?: Error }> = [];
  let completed = 0;

  // Process in chunks
  for (let i = 0; i < requests.length; i += concurrency) {
    const chunk = requests.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map((request) => request())
    );

    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.push({ success: true, data: result.value });
      } else {
        results.push({ success: false, error: result.reason });
      }

      completed++;
      onProgress?.(completed, requests.length);
    }
  }

  return results;
}

/**
 * Clear the API cache
 */
export function clearApiCache() {
  apiCache.clear();
}

/**
 * Export cache instance for advanced usage
 */
export { apiCache };
