// pages/api/video-admin/playlists/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;
  const traceId = (req as any).traceId;

  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { active, search, limit = 50, offset = 0 } = req.query;

    const where: any = {};

    // Filter by active status if specified
    if (active !== undefined) {
      where.isActive = active === "true";
    }

    // Search functionality for finding playlists by name or description
    if (search && typeof search === "string") {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch playlists with proper sorting - most videos first
    const playlists = await prisma.playlist.findMany({
      where,
      orderBy: [
        { itemCount: "desc" }, // Most videos first
        { updatedAt: "desc" }, // Most recently updated second
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.playlist.count({ where });

    // Format playlists with all the information the frontend needs
    const formattedPlaylists = playlists.map((playlist) => ({
      id: playlist.id,
      playlistId: playlist.playlistId,
      name: playlist.title, // Using 'name' for frontend compatibility
      title: playlist.title,
      description: playlist.description || "",
      videoCount: playlist.itemCount || 0,
      itemCount: playlist.itemCount || 0, // Include both for compatibility
      thumbnailUrl: playlist.thumbnailUrl || null,
      isActive: playlist.isActive !== false,
      lastSynced: playlist.updatedAt,
      channelTitle: playlist.channelTitle || null,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    }));

    // Set helpful headers for debugging
    res.setHeader("X-Total-Count", total.toString());
    res.setHeader("X-Trace-Id", traceId);

    // Return in a format that the frontend expects
    // This supports both the array format and the object with metadata format
    return res.status(200).json(formattedPlaylists);
  } catch (error) {
    console.error(`[${traceId}] Failed to fetch playlists:`, error);
    return res.status(500).json({
      error: "Failed to fetch playlists",
      traceId,
    });
  }
};

export default withAdminApi(handler);
