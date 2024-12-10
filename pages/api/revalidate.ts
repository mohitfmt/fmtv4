// pages/api/revalidate.ts
import { NextApiRequest, NextApiResponse } from "next";

const REVALIDATE_SECRET_KEY =
  process.env.REVALIDATE_SECRET_KEY || "default-secret";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("[Revalidate] Received request", {
    method: req.method,
    headers: {
      "x-revalidate-key": req.headers["x-revalidate-key"]?.slice(0, 5) + "...",
    },
  });

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate secret
  if (req.headers["x-revalidate-key"] !== REVALIDATE_SECRET_KEY) {
    console.error("[Revalidate] Invalid secret key");
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    // Force-revalidate the homepage
    await res.revalidate("/");

    console.log("[Revalidate] Homepage revalidated successfully");

    return res.json({
      success: true,
      revalidated: true,
      path: "/",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Revalidate] Error:", err);
    return res.status(500).json({
      error: "Revalidation failed",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
