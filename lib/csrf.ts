// lib/csrf.ts
import crypto from "crypto";

// Simple CSRF token management (light implementation as requested)
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_HEADER = "x-csrf-token";
const CSRF_TOKEN_COOKIE = "csrf-token";

// In-memory store for CSRF tokens (for simplicity, not for production)
const tokenStore = new Map<string, { token: string; expires: number }>();

// Clean up expired tokens periodically
if (typeof global !== "undefined" && !global.csrfCleanupInterval) {
  global.csrfCleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of tokenStore.entries()) {
        if (now > value.expires) {
          tokenStore.delete(key);
        }
      }
    },
    5 * 60 * 1000
  ); // Clean every 5 minutes
}

/**
 * Generate a CSRF token for a session
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour expiry

  tokenStore.set(sessionId, { token, expires });

  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = tokenStore.get(sessionId);

  if (!stored) return false;
  if (Date.now() > stored.expires) {
    tokenStore.delete(sessionId);
    return false;
  }

  // Use timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(stored.token));
}

/**
 * Middleware helper for CSRF validation (lenient mode)
 */
export function csrfProtection(
  req: any,
  res: any,
  options = { strict: false }
) {
  // Skip CSRF for GET requests
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    return true;
  }

  const sessionId = req.session?.user?.email || req.headers["x-session-id"];

  if (!sessionId) {
    // In lenient mode, allow requests without session
    if (!options.strict) {
      console.warn("[CSRF] Request without session, allowing in lenient mode");
      return true;
    }
    return false;
  }

  const token = req.headers[CSRF_TOKEN_HEADER] || req.body?.csrfToken;

  if (!token) {
    // In lenient mode, log but allow
    if (!options.strict) {
      console.warn("[CSRF] Missing CSRF token, allowing in lenient mode");
      return true;
    }
    return false;
  }

  return validateCSRFToken(sessionId, token);
}

/**
 * Get or create CSRF token for client
 */
export function getCSRFToken(req: any): string {
  const sessionId = req.session?.user?.email || req.headers["x-session-id"];

  if (!sessionId) {
    // Generate a temporary token for non-authenticated users
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
  }

  const existing = tokenStore.get(sessionId);
  if (existing && Date.now() < existing.expires) {
    return existing.token;
  }

  return generateCSRFToken(sessionId);
}

// TypeScript global declarations
declare global {
  var csrfCleanupInterval: NodeJS.Timeout | undefined;
}
