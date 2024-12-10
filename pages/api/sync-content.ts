import { NextApiRequest, NextApiResponse } from "next";
import { revalidateTag, revalidatePath } from "next/cache";

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

async function revalidateContent(updates: ContentUpdate[]) {
  const results = {
    revalidated: new Set<string>(),
    failed: new Set<string>(),
  };

  try {
    // First revalidate homepage using tag
    try {
      await revalidateTag("homepage-data");
      await revalidateTag("home-page");
      results.revalidated.add("/");
      console.log("[Revalidate] Homepage tags revalidated successfully");
    } catch (error) {
      console.error("[Revalidate] Homepage tag revalidation failed:", error);
      results.failed.add("/");
    }

    // Then handle individual article paths
    for (const update of updates) {
      if (update.link.includes("/?p=")) {
        console.log(`[Skip] Ignoring ?p= URL: ${update.link}`);
        continue;
      }

      try {
        const path = new URL(update.link).pathname;
        await revalidatePath(path);
        results.revalidated.add(path);
        console.log(`[Revalidate] Path revalidated successfully: ${path}`);
      } catch (error) {
        console.error(
          `[Revalidate] Path revalidation failed: ${update.link}`,
          error
        );
        results.failed.add(update.link);
      }
    }

    return {
      revalidated: Array.from(results.revalidated),
      failed: Array.from(results.failed),
    };
  } catch (error) {
    console.error("[Revalidate] Process failed:", error);
    return {
      revalidated: Array.from(results.revalidated),
      failed: Array.from(results.failed),
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.info("[Handler] Received sync request", {
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  try {
    const payload = req.body as UpdatePayload;

    // Validate payload
    if (!payload?.updates || !Array.isArray(payload.updates)) {
      return res.status(400).json({ error: "Invalid payload structure" });
    }

    const result = await revalidateContent(payload.updates);

    console.info("[Sync] Complete", {
      revalidated: result.revalidated.length,
      failed: result.failed.length,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Sync] Failed:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
