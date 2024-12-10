import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.headers["x-revalidate-key"] !== process.env.REVALIDATE_SECRET_KEY) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    await res.revalidate("/");
    console.log("[Revalidate] Homepage revalidated successfully");
    return res.json({ revalidated: true });
  } catch (err) {
    console.error("[Revalidate] Error:", err);
    return res.status(500).json({ error: "Error revalidating" });
  }
}
