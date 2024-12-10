// pages/api/revalidate.ts
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check for secret to confirm this is a valid request
  if (req.headers["x-revalidate-key"] !== process.env.REVALIDATE_SECRET_KEY) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    // Force-revalidate the homepage
    await res.revalidate("/");

    console.log("[Revalidate] Homepage revalidated successfully");

    return res.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    // If there was an error, Next.js will continue
    // to show the last successfully generated page
    return res.status(500).send("Error revalidating");
  }
}
