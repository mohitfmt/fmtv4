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
      console.log("[WebSub] Subscription verified with challenge");
      return res.status(200).send(challenge);
    }

    return res.status(400).json({ error: "Invalid verification request" });
  }

  // Handle content notifications
  if (req.method === "POST") {
    try {
      console.log("[WebSub] Received content update notification");

      // Construct absolute URL for internal API call
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const host =
        req.headers.host ||
        process.env.NEXT_PUBLIC_DOMAIN ||
        "dev-v4.freemalaysiatoday.com";
      const revalidateUrl = `${protocol}://${host}/api/revalidate`;

      console.log("[WebSub] Calling revalidate endpoint:", revalidateUrl);

      const revalidateRes = await fetch(revalidateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-key":
            process.env.REVALIDATE_SECRET_KEY || "default-secret",
        },
      });

      const responseData = await revalidateRes.text();
      console.log(
        "[WebSub] Revalidate response:",
        revalidateRes.status,
        responseData
      );

      if (!revalidateRes.ok) {
        throw new Error(
          `Revalidation failed (${revalidateRes.status}): ${responseData}`
        );
      }

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
    bodyParser: true,
  },
};
