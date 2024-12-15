import { NextApiRequest, NextApiResponse } from "next";

let lastUpdateTime: string = new Date().toISOString();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      // Just return the current lastUpdateTime
      return res.status(200).json({ lastUpdateTime });
    }

    if (req.method === "POST") {
      // Update the time and return it
      lastUpdateTime = new Date().toISOString();
      return res.status(200).json({ lastUpdateTime });
    }

    // Method not allowed
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error("Error in /api/last-update:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
