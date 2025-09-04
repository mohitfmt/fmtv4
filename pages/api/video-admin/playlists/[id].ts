import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePlaylistSchema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;
  const traceId = (req as any).traceId;

  switch (method) {
    case "GET":
      return handleGetPlaylist(req, res, traceId);
    case "PATCH":
      return handleUpdatePlaylist(req, res, traceId);
    default:
      res.setHeader("Allow", ["GET", "PATCH"]);
      return res.status(405).json({ error: "Method not allowed" });
  }
};

async function handleGetPlaylist(
  req: NextApiRequest,
  res: NextApiResponse,
  traceId: string
) {
  try {
    const { id } = req.query;

    const playlist = await prisma.playlist.findUnique({
      where: { playlistId: id as string },
      // include: {
      //   _count: {
      //     select: { videos: true },
      //   },
      // },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
        traceId,
      });
    }

    return res.status(200).json({
      data: {
        ...playlist,
        // videoCount: playlist?._count?.videos,
        videoCount: 0,
      },
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to fetch playlist:`, error);
    return res.status(500).json({
      error: "Failed to fetch playlist",
      traceId,
    });
  }
}

async function handleUpdatePlaylist(
  req: NextApiRequest,
  res: NextApiResponse,
  traceId: string
) {
  try {
    const { id } = req.query;
    const session = (req as any).session;

    const validation = updatePlaylistSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: validation.error,
        traceId,
      });
    }

    const playlist = await prisma.playlist.update({
      where: { playlistId: id as string },
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
    });

    // Log admin action
    await prisma.admin_activity_logs.create({
      data: {
        action: "UPDATE_PLAYLIST",
        id: playlist.id,
        entityType: "playlist",
        userId: session.user.id,
        // userEmail: session.user.email,
        metadata: {
          playlistId: playlist.playlistId,
          changes: validation.data,
        },
        // traceId,
      },
    });

    return res.status(200).json({
      data: playlist,
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to update playlist:`, error);
    return res.status(500).json({
      error: "Failed to update playlist",
      traceId,
    });
  }
}

export default withAdminApi(handler);
