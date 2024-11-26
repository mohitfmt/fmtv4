// pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from "next";

type HealthResponse = {
  status: string;
  timestamp: string;
  environment: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
  });
}
