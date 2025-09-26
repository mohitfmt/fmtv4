import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ErrorBody = { success: false; error: string };
type GetBody =
  | ErrorBody
  | {
      success: true;
      playlist: {
        playlistId: string;
        title: string;
        description: string | null;
        visibility: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        slug: string | null;
        channelId: string | null;
        channelTitle: string | null;
        itemCount: number;
        thumbnailUrl: string | null;
        lastSyncedAt: Date | null;
        syncVersion: number;
        privacyStatus: string | null;
        publishedAt: Date | null;
        etag: string | null;
        lastModified: string | null;
        fingerprint: string | null;
        lastFingerprintAt: Date | null;
        syncInProgress: boolean;
        lastSyncResult: Prisma.InputJsonValue | null;
        syncLeaseUntil: Date | null;
        syncLeaseOwner: string | null;
        activeWindowUntil: Date | null;
      };
    };

type PatchBody =
  | ErrorBody
  | {
      success: true;
      playlist: {
        playlistId: string;
        isActive: boolean;
        activeWindowUntil: Date | null;
        updatedAt: Date;
      };
    };

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetBody | PatchBody>
) {
  const playlistId = String(req.query.id || "");
  if (!playlistId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing playlist id" });
  }

  if (req.method === "GET") {
    const playlist = await prisma.playlist.findUnique({
      where: { playlistId },
      select: {
        playlistId: true,
        title: true,
        description: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        slug: true,
        channelId: true,
        channelTitle: true,
        itemCount: true,
        thumbnailUrl: true,
        lastSyncedAt: true,
        syncVersion: true,
        privacyStatus: true,
        publishedAt: true,
        etag: true,
        lastModified: true,
        fingerprint: true,
        lastFingerprintAt: true,
        syncInProgress: true,
        lastSyncResult: true,
        syncLeaseUntil: true,
        syncLeaseOwner: true,
        activeWindowUntil: true,
      },
    });

    if (!playlist) {
      return res
        .status(404)
        .json({ success: false, error: "Playlist not found" });
    }

    return res.status(200).json({ success: true, playlist });
  }

  if (req.method === "PATCH") {
    // We only allow toggling isActive from here to keep scope tight.
    // (Add more fields later if you decide to expose them.)
    const { isActive } = req.body as { isActive?: boolean };

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({
          success: false,
          error: "Invalid body: isActive must be boolean",
        });
    }

    const now = new Date();
    const updateData: Record<string, any> = {
      isActive,
      updatedAt: now,
    };

    // Optional short active window when turning on (kept small to avoid surprises)
    if (isActive) {
      updateData.activeWindowUntil = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
    } else {
      updateData.activeWindowUntil = null;
    }

    const updated = await prisma.playlist.update({
      where: { playlistId },
      data: updateData,
      select: {
        playlistId: true,
        isActive: true,
        activeWindowUntil: true,
        updatedAt: true,
      },
    });

    // audit log (match your collection + fields)
    const userId =
      (req.headers["x-admin-user"] as string) ||
      (req.headers["x-user-id"] as string) ||
      "system";
    const ipAddress =
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "";
    const userAgent = (req.headers["user-agent"] as string) || "";

    await prisma.admin_activity_logs.create({
      data: {
        userId,
        action: "UPDATE_PLAYLIST",
        entityType: "playlist",
        metadata: { playlistId, isActive } as Prisma.InputJsonValue,
        ipAddress,
        userAgent,
        timestamp: now,
      },
    });

    return res.status(200).json({ success: true, playlist: updated });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default handler;
