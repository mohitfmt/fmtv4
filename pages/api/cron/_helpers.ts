// pages/api/cron/_helpers.ts

import { NextApiRequest } from "next";
import { parseString } from "xml2js";
import { promisify } from "util";
import crypto from "crypto";

const parseXML = promisify(parseString);

// ==================== AUTH ====================
export function isAuthorized(req: NextApiRequest): boolean {
  // Reject if key is in query string (security: query params get logged)
  if (req.query.key) {
    console.error("🚨 SECURITY: Rejected auth key in query string");
    return false;
  }

  // Only accept key from header
  const headerKey = req.headers["x-cron-key"] as string;
  if (!headerKey) {
    console.error("🚨 Missing x-cron-key header");
    return false;
  }

  const userEmail = req.cookies?.user_email;
  if (userEmail && userEmail.endsWith("@freemalaysiatoday.com")) {
    return true;
  }

  return headerKey === process.env.CRON_SECRET_KEY;
}

// ==================== LOGGING ====================
export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

export interface StructuredLog {
  timestamp: string;
  traceId: string;
  job: string;
  level: LogLevel;
  message: string;
  [key: string]: any;
}

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

export class Logger {
  private traceId: string;
  private job: string;
  private isDev: boolean;

  constructor(job: string, traceId: string) {
    this.job = job;
    this.traceId = traceId;
    this.isDev = process.env.NODE_ENV !== "production";
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>) {
    const timestamp = new Date().toISOString();

    // Structured log for Cloud Logging
    const structured: StructuredLog = {
      timestamp,
      traceId: this.traceId.substring(0, 8),
      job: this.job,
      level,
      message,
      ...data,
    };

    // In production, output clean JSON
    if (!this.isDev) {
      console.log(JSON.stringify(structured));
      return;
    }

    // In dev, output colored logs
    const prefix = `[${timestamp}] [${this.job}:${this.traceId.substring(0, 8)}]`;
    let color = colors.cyan;
    let icon = "ℹ️";

    switch (level) {
      case "success":
        color = colors.green;
        icon = "✅";
        break;
      case "warn":
        color = colors.yellow;
        icon = "⚠️";
        break;
      case "error":
        color = colors.red;
        icon = "❌";
        break;
      case "debug":
        color = colors.gray;
        icon = "🔍";
        break;
    }

    console.log(`${color}${prefix} ${icon} ${message}${colors.reset}`);
    if (data && Object.keys(data).length > 0) {
      console.log(`${color}  └─ ${JSON.stringify(data)}${colors.reset}`);
    }
  }

  debug(message: string, data?: Record<string, any>) {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, any>) {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, any>) {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, any>) {
    this.log("error", message, data);
  }

  success(message: string, data?: Record<string, any>) {
    this.log("success", message, data);
  }
}

// ==================== EXPONENTIAL BACKOFF ====================
export interface BackoffOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  options: BackoffOptions = {},
  logger?: Logger
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 250,
    maxDelayMs = 10000,
    jitterMs = 100,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add small jitter before each attempt
      if (attempt > 0) {
        const jitter = Math.floor(Math.random() * jitterMs);
        await sleep(delay + jitter);
      }

      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retriable
      const errorMessage =
        error?.errors?.[0]?.reason ||
        error?.code ||
        error?.message ||
        "unknown";
      const isRetriable =
        /rateLimitExceeded|quotaExceeded|backendError|internal|ECONNRESET|ETIMEDOUT|503/.test(
          String(errorMessage)
        );

      if (!isRetriable || attempt === maxRetries - 1) {
        logger?.error(`Non-retriable error or max retries reached`, {
          attempt: attempt + 1,
          error: errorMessage,
        });
        throw error;
      }

      logger?.warn(`Retriable error, backing off`, {
        attempt: attempt + 1,
        nextDelayMs: delay,
        error: errorMessage,
      });

      // Exponential backoff
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }

  throw lastError || new Error("Backoff failed");
}

// ==================== FETCH WITH TIMEOUT ====================
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 8000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ==================== RSS PARSING (using xml2js) ====================
export interface RSSCheckResult {
  changed: boolean;
  etag?: string;
  lastModified?: string;
  videoIds?: string[];
  error?: string;
}

export async function checkRSSFeed(
  url: string,
  etag?: string | null,
  lastModified?: string | null,
  logger?: Logger
): Promise<RSSCheckResult> {
  try {
    const headers: HeadersInit = {};
    if (etag) headers["If-None-Match"] = etag;
    if (lastModified) headers["If-Modified-Since"] = lastModified;

    logger?.debug(`Checking RSS feed`, { url, hasEtag: !!etag });

    const response = await fetchWithTimeout(url, {
      headers,
      timeoutMs: 8000,
    });

    // Not modified
    if (response.status === 304) {
      logger?.debug(`RSS feed not modified (304)`);
      return { changed: false };
    }

    // Get new ETags
    const newEtag = response.headers.get("etag") || undefined;
    const newLastModified = response.headers.get("last-modified") || undefined;

    // Parse XML using xml2js
    const text = await response.text();
    const parsed = await parseXML(text);

    // Extract video IDs from the feed
    const videoIds: string[] = [];
    const feed = (parsed as { feed?: { entry?: any } })?.feed;
    const entries = feed?.entry || [];
    const entryArray = Array.isArray(entries) ? entries : [entries];

    for (const entry of entryArray) {
      // YouTube feeds have videoId in yt:videoId
      const videoId = entry?.["yt:videoId"]?.[0] || entry?.videoId?.[0];
      if (videoId) {
        videoIds.push(videoId);
      }
    }

    logger?.info(`RSS feed changed`, { videoCount: videoIds.length });

    return {
      changed: true,
      etag: newEtag,
      lastModified: newLastModified,
      videoIds,
    };
  } catch (error: any) {
    logger?.error(`RSS check failed`, { error: error.message });
    return {
      changed: false,
      error: error.message,
    };
  }
}

// ==================== FINGERPRINTING ====================
export function computeFingerprint(items: any[], length: number = 32): string {
  const videoIds = items
    .map((item) => item.contentDetails?.videoId || item.videoId)
    .filter(Boolean);

  const hash = crypto
    .createHash("sha256")
    .update(videoIds.join(","))
    .digest("hex");

  return length >= 64 ? hash : hash.substring(0, Math.max(32, length));
}

// ==================== UTILITIES ====================
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateTraceId(): string {
  return crypto.randomUUID();
}

// ==================== PLACEHOLDER VIDEO (matching actual schema) ====================
export function createPlaceholderVideo(videoId: string) {
  return {
    videoId,
    title: "Video Unavailable",
    description:
      "This video is private, deleted, or not available in your region",
    channelId: "unknown",
    channelTitle: "Unknown Channel",
    publishedAt: new Date(),

    // Required fields from schema
    categoryId: "0",
    defaultLanguage: "en",
    tags: [],
    playlists: [],
    relatedVideos: [],

    thumbnails: {
      default: "",
      high: "",
      medium: "",
      standard: "",
    },

    contentDetails: {
      caption: false,
      definition: "sd",
      dimension: "2d",
      duration: "PT0S",
      durationSeconds: 0,
      licensedContent: false,
      projection: "rectangular",
    },

    statistics: {
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
    },

    status: {
      embeddable: false,
      license: "youtube",
      madeForKids: false,
      privacyStatus: "private", // This is where privacyStatus lives!
      publicStatsViewable: false,
      uploadStatus: "processed",
    },

    // Metadata fields
    isShort: false,
    videoType: "unavailable",
    tier: "D",
    isActive: false,
    syncVersion: 1,
  };
}

// ==================== FIND VIDEO BY ID ====================
export async function findVideoByVideoId(prisma: any, videoId: string) {
  return await prisma.videos.findFirst({
    where: { videoId },
  });
}

// ==================== RESPONSE TYPES ====================
export interface CronResponse {
  success: boolean;
  traceId: string;
  duration: number;
  partial?: boolean;
  results?: Record<string, any>;
  errors?: string[];
}

// ==================== VALIDATION ====================
export function validateEnvironment(): string[] {
  const required = [
    "CRON_SECRET_KEY",
    "YOUTUBE_API_KEY",
    "YOUTUBE_CHANNEL_ID",
    "DATABASE_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);
  return missing;
}
