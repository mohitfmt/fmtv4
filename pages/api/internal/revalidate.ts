// pages/api/internal/revalidate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

/**
 * Only allow revalidations for specific path prefixes.
 * We keep this intentionally narrow to avoid accidents.
 */
const ALLOWED_PATH_PREFIXES = ["/videos", "/"];

/**
 * Constant-time string compare for secrets.
 */
function timingSafeEqual(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) {
    // spend equal time anyway
    crypto.timingSafeEqual(aa, aa);
    return false;
  }
  return crypto.timingSafeEqual(aa, bb);
}

/**
 * Normalize an input into a clean path (strip domain, query, hash),
 * ensure it starts with a single leading slash.
 */
function sanitizePath(input: string): string {
  let path = input.trim();
  // if someone passes full URL, extract pathname
  try {
    if (/^https?:\/\//i.test(path)) {
      const u = new URL(path);
      path = u.pathname;
    }
  } catch {
    // ignore; fall through with original string
  }
  // strip query/hash if any slipped through
  path = path.split("?")[0].split("#")[0];
  // ensure leading slash once
  if (!path.startsWith("/")) path = `/${path}`;
  // collapse multiple leading slashes
  path = path.replace(/^\/+/, "/");
  return path;
}

/**
 * Validate that a path matches the allowed prefixes.
 */
function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

type Ok = { success: true; revalidated: string[] };
type Err = { success: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  // Security: expect a dedicated secret for the video system.
  // Our sync helpers send the header "x-revalidate-secret".
  const provided = (req.headers["x-revalidate-secret"] as string) || "";
  const expected =
    process.env.REVALIDATE_SECRET ||
    process.env.REVALIDATE_SECRET_KEY || // fall back if you reuse the site key
    "";

  if (!timingSafeEqual(provided, expected)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const body = req.body ?? {};
  // Support either a single "path" or an array "paths"
  const raw = Array.isArray(body.paths)
    ? body.paths
    : body.path
      ? [body.path]
      : [];

  if (raw.length === 0 || !raw.every((p: any) => typeof p === "string")) {
    return res.status(400).json({
      success: false,
      error: "Provide a path string or paths string[]",
    });
  }

  // Sanitize & validate paths
  const paths = raw.map((p: string) => sanitizePath(p));
  for (const p of paths) {
    if (!isAllowedPath(p)) {
      return res
        .status(403)
        .json({ success: false, error: `Path not allowed: ${p}` });
    }
  }

  // Revalidate sequentially to keep it simple & predictable
  const ok: string[] = [];
  for (const p of paths) {
    try {
      await res.revalidate(p);
      ok.push(p);
    } catch (err) {
      // If any revalidation fails, return an error (caller can retry)
      return res
        .status(500)
        .json({ success: false, error: `Revalidation failed for ${p}` });
    }
  }

  return res.status(200).json({ success: true, revalidated: ok });
}
