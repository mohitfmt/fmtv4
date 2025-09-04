import {
  GetServerSideProps,
  GetServerSidePropsContext,
  NextApiHandler,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { adminAuditLog, generateTraceId } from "./logging";

// Configuration
const ALLOWED_EMAIL_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN || "freemalaysiatoday.com";
const ADMIN_ALLOWED_HOST =
  process.env.ADMIN_ALLOWED_HOST || "dev-v4.freemalaysiatoday.com";

/**
 * Check if host is allowed
 */
export function isAllowedHost(host: string | undefined): boolean {
  if (!host) return false;
  const cleanHost = host.split(":")[0].toLowerCase();

  if (process.env.NODE_ENV === "development") {
    return cleanHost === "localhost" || cleanHost === ADMIN_ALLOWED_HOST;
  }

  return cleanHost === ADMIN_ALLOWED_HOST;
}

/**
 * Check if email is allowed
 */
export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

/**
 * Extract host from request
 */
export function extractHost(
  req: NextApiRequest | GetServerSidePropsContext["req"]
): string {
  return (req.headers["x-forwarded-host"] || req.headers.host || "").toString();
}

/**
 * Extract client IP
 */
export function extractClientIp(
  req: NextApiRequest | GetServerSidePropsContext["req"]
): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Set admin security headers
 */
export function setAdminSecurityHeaders(
  res: NextApiResponse | GetServerSidePropsContext["res"]
) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
}

/**
 * SSR guard for admin pages
 */
export function withAdminPageSSR(
  gssp?: GetServerSideProps
): GetServerSideProps {
  return async (context) => {
    const { req, res } = context;
    const traceId = generateTraceId();
    const host = extractHost(req);
    const ip = extractClientIp(req);
    const userAgent = req.headers["user-agent"] || "unknown";
    const path = context.resolvedUrl;

    // Set headers
    res.setHeader("X-Correlation-ID", traceId);
    setAdminSecurityHeaders(res);

    // Check host
    if (!isAllowedHost(host)) {
      await adminAuditLog({
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || "development",
        host,
        path,
        method: "GET",
        ip,
        userAgent,
        outcome: "redirect",
        reason: "host_mismatch",
        traceId,
      });

      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    // Get session
    const session = await getServerSession(
      context.req,
      context.res,
      authOptions
    );

    // Not authenticated
    if (!session?.user?.email) {
      // Set admin flow cookie (HttpOnly)
      const isProduction = process.env.NODE_ENV === "production";
      res.setHeader(
        "Set-Cookie",
        `admin_flow=true; Path=/; Max-Age=60; HttpOnly; SameSite=Lax${isProduction ? "; Secure" : ""}`
      );

      await adminAuditLog({
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || "development",
        host,
        path,
        method: "GET",
        ip,
        userAgent,
        outcome: "deny",
        reason: "not_authenticated",
        traceId,
      });

      return {
        props: {
          requiresAuth: true,
          enableOneTap: true,
          traceId,
        },
      };
    }

    // Check domain
    if (!isAllowedAdminEmail(session.user.email)) {
      // Clear admin flow cookie
      const isProduction = process.env.NODE_ENV === "production";
      res.setHeader(
        "Set-Cookie",
        `admin_flow=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isProduction ? "; Secure" : ""}`
      );

      await adminAuditLog({
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || "development",
        host,
        path,
        method: "GET",
        ip,
        userEmail: session.user.email,
        userId: session.user.id || "unknown",
        userAgent,
        outcome: "deny",
        reason: "domain_restricted",
        traceId,
      });

      return {
        props: {
          unauthorized: true,
          userEmail: session.user.email,
          traceId,
        },
      };
    }

    // Authorized - clear cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.setHeader(
      "Set-Cookie",
      `admin_flow=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isProduction ? "; Secure" : ""}`
    );

    await adminAuditLog({
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development",
      host,
      path,
      method: "GET",
      ip,
      userEmail: session.user.email,
      userId: session.user.id || "unknown",
      userAgent,
      outcome: "allow",
      traceId,
    });

    // Run wrapped GSSP
    if (gssp) {
      const result = await gssp(context);

      if ("props" in result) {
        const props = await Promise.resolve(result.props);
        return {
          props: {
            ...props,
            session,
            traceId,
          },
        };
      }

      return result;
    }

    return {
      props: {
        session,
        traceId,
      },
    };
  };
}

/**
 * API wrapper for admin endpoints
 */
export function withAdminApi(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    const traceId = generateTraceId();
    const host = extractHost(req);
    const ip = extractClientIp(req);
    const userAgent = req.headers["user-agent"] || "unknown";
    const path = req.url || "unknown";
    const method = req.method || "unknown";

    // Set headers
    res.setHeader("X-Correlation-ID", traceId);
    setAdminSecurityHeaders(res);

    // Check host
    if (!isAllowedHost(host)) {
      await adminAuditLog({
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || "development",
        host,
        path,
        method,
        ip,
        userAgent,
        outcome: "redirect",
        reason: "host_mismatch",
        traceId,
      });

      return res.status(403).json({ error: "Invalid host" });
    }

    // Get session
    const session = await getServerSession(req, res, authOptions);

    // Not authenticated
    if (!session?.user?.email) {
      await adminAuditLog({
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || "development",
        host,
        path,
        method,
        ip,
        userAgent,
        outcome: "deny",
        reason: "not_authenticated",
        traceId,
      });

      return res.status(403).json({ error: "Authentication required" });
    }

    // Check domain
    if (!isAllowedAdminEmail(session.user.email)) {
      await adminAuditLog({
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || "development",
        host,
        path,
        method,
        ip,
        userEmail: session.user.email,
        userId: session.user.id || "unknown",
        userAgent,
        outcome: "deny",
        reason: "domain_restricted",
        traceId,
      });

      return res.status(403).json({ error: "Domain not allowed" });
    }

    // Authorized
    await adminAuditLog({
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development",
      host,
      path,
      method,
      ip,
      userEmail: session.user.email,
      userId: session.user.id || "unknown",
      userAgent,
      outcome: "allow",
      traceId,
    });

    // Attach to request
    (req as any).session = session;
    (req as any).traceId = traceId;

    return handler(req, res);
  };
}
