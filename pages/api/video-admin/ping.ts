import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (req as any).session;
  const traceId = (req as any).traceId;

  return res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    user: session?.user?.email,
    traceId,
  });
}
