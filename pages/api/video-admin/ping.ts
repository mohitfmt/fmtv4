import type { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";

export default withAdminApi(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = (req as any).session;
    const traceId = (req as any).traceId;

    return res.status(200).json({
      ok: true,
      time: new Date().toISOString(),
      user: session?.user?.email,
      traceId,
    });
  }
);
