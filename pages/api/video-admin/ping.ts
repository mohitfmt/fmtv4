import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // const session = (req as any).session;
  const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";
  const traceId = (req as any).traceId;

  return res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    user: userEmail,
    traceId,
  });
}
