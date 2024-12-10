import { NextApiRequest, NextApiResponse } from "next";
import { revalidateTag } from "next/cache";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle WebSub subscription verification
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.challenge": challenge } = req.query;

    if (mode === "subscribe" && challenge) {
      console.log("[WebSub] Subscription verified");
      return res.status(200).send(challenge);
    }

    return res.status(400).json({ error: "Invalid verification request" });
  }

  // Handle content notifications
  if (req.method === "POST") {
    try {
      console.log("[WebSub] Received content update notification", req);

      // Revalidate homepage
      await revalidateTag("homepage-data");
      await revalidateTag("home-page");

      console.log("[WebSub] Homepage revalidated");

      return res.status(200).json({
        success: true,
        message: "Update processed and homepage revalidated",
      });
    } catch (error) {
      console.error("[WebSub] Revalidation failed:", error);
      return res.status(500).json({
        error: "Revalidation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export const config = {
  api: {
    bodyParser: {
      // Allow raw XML from WordPress
      bodyParser: false,
    },
  },
};
