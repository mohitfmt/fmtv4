import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const autoSyncSchema = z.object({
  enabled: z.boolean(),
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;
  const session = (req as any).session;

  try {
    const validation = autoSyncSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: validation.error,
        traceId,
      });
    }

    const { enabled } = validation.data;

    // const syncStatus = await prisma.syncStatus.upsert({
    //   where: { id: "main" },
    //   update: {
    //     isActive: enabled,
    //     nextSync: enabled ? new Date(Date.now() + 60 * 60 * 1000) : null,
    //   },
    //   create: {
    //     id: "main",
    //     isActive: enabled,
    //     nextSync: enabled ? new Date(Date.now() + 60 * 60 * 1000) : null,
    //   },
    // });

    await prisma.admin_activity_logs.create({
      data: {
        action: enabled ? "ENABLE_AUTO_SYNC" : "DISABLE_AUTO_SYNC",
        entityType: "sync",
        userId: session.user.id,
        // userEmail: session.user.email,
        metadata: { enabled },
        // traceId,
      },
    });

    return res.status(200).json({
      data: {
        // isActive: syncStatus.isActive,
        // nextSync: syncStatus.nextSync,
      },
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to toggle auto sync:`, error);
    return res.status(500).json({
      error: "Failed to toggle auto sync",
      traceId,
    });
  }
};

export default withAdminApi(handler);
