import { NextApiRequest, NextApiResponse } from "next";
import { revalidateTag, revalidatePath } from "next/cache";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

interface ContentUpdate {
  id: string;
  title: string;
  link: string;
  sections: string[];
  categories: string[];
  pubDate: string;
  modifiedDate: string;
}

interface UpdatePayload {
  updates: ContentUpdate[];
  timestamp: string;
}

// interface LogEntry {
//   level: "INFO" | "WARN" | "ERROR";
//   category: "REVALIDATE" | "SYNC" | "CACHE";
//   message: string;
//   metadata?: Record<string, any>;
// }

// Collection pages that need to be revalidated
const COLLECTION_PAGES = {
  sections: [
    "/category/nation",
    "/category/top-bm",
    "/category/business",
    "/category/leisure",
    "/category/opinion",
    "/category/sports",
    "/category/world",
  ],
  special: [
    "/", // Homepage
    // "/latest-news", // Latest news page
    // "/trending", // Trending articles
    // "/most-read", // Most read articles
    // "/editors-picks", // Editor's picks
  ],
};

async function validateConnection() {
  try {
    await prisma.$connect();
    console.log("Successfully connected to MongoDB");

    // Test log creation
    const testLog = await prisma.syncLog.create({
      data: {
        level: "INFO",
        category: "SYNC",
        message: "Database connection test",
        metadata: { test: true },
      },
    });
    console.log("Test log created:", testLog);
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}

async function revalidateContent(updates: ContentUpdate[]) {
  const revalidatedPaths = new Set<string>();

  try {
    // Log start of process

    await prisma.syncLog.create({
      data: {
        level: "INFO",
        category: "SYNC",
        message: `Processing ${updates.length} updates`,
        metadata: { updateCount: updates.length },
      },
    });

    // 1. Revalidate individual article pages
    for (const update of updates) {
      try {
        const articlePath = new URL(update.link).pathname;
        await revalidateTag(`article-${update.id}`);
        await revalidatePath(articlePath);
        revalidatedPaths.add(articlePath);

        await prisma.syncLog.create({
          data: {
            level: "INFO",
            category: "REVALIDATE",
            message: `Article: ${update.title}`,
            metadata: { articleId: update.id, path: articlePath },
          },
        });
      } catch (error) {
        await prisma.syncLog.create({
          data: {
            level: "ERROR",
            category: "REVALIDATE",
            message: `Failed to revalidate article ${update.link}`,
            metadata: { error: String(error), articleId: update.id },
          },
        });
      }
    }

    // 2. Revalidate collection pages
    const collectionPaths = [
      ...COLLECTION_PAGES.sections,
      ...COLLECTION_PAGES.special,
    ];

    for (const path of collectionPaths) {
      try {
        await revalidateTag(`page-${path}`);
        await revalidatePath(path);
        revalidatedPaths.add(path);

        await prisma.syncLog.create({
          data: {
            level: "INFO",
            category: "REVALIDATE",
            message: `Collection: ${path}`,
            metadata: { path },
          },
        });
      } catch (error) {
        await prisma.syncLog.create({
          data: {
            level: "ERROR",
            category: "REVALIDATE",
            message: `Failed to revalidate collection ${path}`,
            metadata: { error: String(error), path },
          },
        });
      }
    }

    // 3. Handle Cloudflare cache
    if (revalidatedPaths.size > 0) {
      try {
        await purgeCloudflareCache(Array.from(revalidatedPaths));
        await prisma.syncLog.create({
          data: {
            level: "INFO",
            category: "CACHE",
            message: `Purged ${revalidatedPaths.size} URLs from Cloudflare`,
            metadata: { paths: Array.from(revalidatedPaths) },
          },
        });
      } catch (error) {
        await prisma.syncLog.create({
          data: {
            level: "ERROR",
            category: "CACHE",
            message: "Cloudflare cache purge failed",
            metadata: { error: String(error) },
          },
        });
      }
    }

    return revalidatedPaths;
  } catch (error) {
    await prisma.syncLog.create({
      data: {
        level: "ERROR",
        category: "SYNC",
        message: "Revalidation process failed",
        metadata: { error: String(error) },
      },
    });
    throw error;
  }
}

async function purgeCloudflareCache(paths: string[]) {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[WARN] Cloudflare credentials not configured");
    return;
  }

  const urls = paths.map((path) => `https://www.freemalaysiatoday.com${path}`);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: urls }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        `Cloudflare purge failed: ${result.errors?.[0]?.message}`
      );
    }

    console.log(`[CACHE] Purged ${urls.length} URLs from Cloudflare`);
  } catch (error) {
    console.error("[CACHE] Purge failed:", error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Validate database connection first
    await validateConnection();

    // Send immediate acknowledgment
    res.status(200).json({ received: true });

    // Create initial log with try-catch
    try {
      const logEntry = await prisma.syncLog.create({
        data: {
          level: "INFO",
          category: "SYNC",
          message: "Received sync request",
          metadata: {
            method: req.method,
            body: req.body,
            timestamp: new Date().toISOString(),
          },
        },
      });
      console.log("Created log entry:", logEntry);
    } catch (error) {
      console.error("Failed to create initial log:", error);
    }

    // Process the update asynchronously
    if (req.method === "POST") {
      try {
        const payload = req.body as UpdatePayload;
        await revalidateContent(payload.updates);
      } catch (error) {
        console.error("[ERROR] Update processing failed:", error);
        await prisma.syncLog.create({
          data: {
            level: "ERROR",
            category: "SYNC",
            message: "Update processing failed",
            metadata: { error: String(error) },
          },
        });
      }
    }
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    // Disconnect prisma client
    await prisma.$disconnect();
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
