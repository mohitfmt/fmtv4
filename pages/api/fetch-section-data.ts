import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // pages/api/fetch-section-data.ts
  return res.status(410).json({ error: "This endpoint is deprecated." });
}
