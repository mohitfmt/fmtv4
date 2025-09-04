import { v4 as uuidv4 } from "uuid";

// Only import GCP logging in production
const log: any = null;
// if (process.env.NODE_ENV === "production") {
//   // const { Logging } = require("@google-cloud/logging");
//   const logging = new Logging();
//   const LOG_NAME = process.env.GCP_LOG_NAME || "video-admin-audit";
//   log = logging.log(LOG_NAME);
// }

// Admin audit event type
export type AdminAuditEvent = {
  timestamp: string;
  env: string;
  host: string;
  path: string;
  method?: string;
  ip?: string;
  userEmail?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  outcome: "allow" | "deny" | "redirect" | "error" | "sign_in" | "sign_out";
  reason?: string;
  traceId?: string;
  metadata?: Record<string, any>;
};

/**
 * Generate unique trace ID
 */
export function generateTraceId(): string {
  return uuidv4();
}

/**
 * Log admin audit event
 */
export async function adminAuditLog(event: AdminAuditEvent): Promise<void> {
  const enrichedEvent = {
    ...event,
    service: "video-admin",
    version: process.env.npm_package_version || "1.0.0",
  };

  // Development: Just console log with clear tags
  if (process.env.NODE_ENV === "development") {
    const color =
      event.outcome === "allow" || event.outcome === "sign_in"
        ? "\x1b[32m" // Green
        : event.outcome === "error"
          ? "\x1b[31m" // Red
          : "\x1b[33m"; // Yellow

    console.log(
      `${color}[video-admin-audit]`,
      `${event.outcome.toUpperCase()}`,
      "\x1b[0m", // Reset color
      `${event.path}`,
      event.userEmail || "anonymous",
      event.reason || ""
    );

    // Detailed log for debugging if needed
    if (process.env.DEBUG === "true") {
      console.log(
        "[video-admin-debug]",
        JSON.stringify(enrichedEvent, null, 2)
      );
    }
    return;
  }

  // Production: Use GCP logging (works automatically on Cloud Run)
  if (log) {
    try {
      const entry = log.entry(
        {
          severity:
            event.outcome === "allow" || event.outcome === "sign_in"
              ? "INFO"
              : event.outcome === "error"
                ? "ERROR"
                : "WARNING",
          labels: {
            env: event.env,
            outcome: event.outcome,
            reason: event.reason || "none",
          },
          trace: event.traceId
            ? `projects/${process.env.GCP_PROJECT_ID}/traces/${event.traceId}`
            : undefined,
        },
        enrichedEvent
      );

      await log.write(entry);
    } catch (error) {
      // Fallback to console even in production if GCP fails
      console.error("[video-admin-audit] GCP logging failed:", error);
      console.log("[video-admin-audit]", JSON.stringify(enrichedEvent));
    }
  }
}
