// pages/api/websub-callback.ts
import { NextApiRequest, NextApiResponse } from "next";

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
      console.log("[WebSub] Received content update notification");

      // Use fetch to call the revalidate endpoint
      const revalidateRes = await fetch(
        `${process.env.NEXT_PUBLIC_DOMAIN}/api/revalidate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Add a secret key for security
            "x-revalidate-key":
              process.env.REVALIDATE_SECRET_KEY || "default-secret",
          },
        }
      );

      if (!revalidateRes.ok) {
        throw new Error(`Revalidation failed: ${revalidateRes.statusText}`);
      }

      console.log("[WebSub] Homepage revalidated successfully");

      return res.status(200).json({
        success: true,
        message: "Update processed and homepage revalidated",
      });
    } catch (error) {
      console.error("[WebSub] Error:", error);
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
    bodyParser: true, // Enable body parsing for form-urlencoded data
  },
};
