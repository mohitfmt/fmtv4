import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

type ErrorBody = { success: false; error: string };
type ListItem = {
  playlistId: string;
  title: string;
  thumbnailUrl: string | null;
  channelTitle: string | null;
  itemCount: number;
  isActive: boolean;
  updatedAt: Date;
  syncInProgress: boolean;
  lastSyncResult: unknown | null; // passthrough JSON
  slug: string | null;
};
type ListBody =
  | ErrorBody
  | {
      success: true;
      playlists: ListItem[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };

function parsePositiveInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const int = Math.trunc(n);
  if (int < min) return min;
  if (int > max) return max;
  return int;
}

async function handler(req: NextApiRequest, res: NextApiResponse<ListBody>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const {
    search = "",
    active,
    sort = "updated",
    page = "1",
    limit = "20",
  } = req.query;

  const pageNum = parsePositiveInt(page, 1, 1, 10_000);
  const limitNum = parsePositiveInt(limit, 20, 1, 100);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (typeof search === "string" && search.trim().length > 0) {
    where.OR = [
      { title: { contains: search.trim(), mode: "insensitive" } },
      { playlistId: { contains: search.trim() } },
      { slug: { contains: search.trim(), mode: "insensitive" } },
      { channelTitle: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  let orderBy: any = {};
  switch (sort) {
    case "videos":
      orderBy = { itemCount: "desc" };
      break;
    case "name":
      orderBy = { title: "asc" };
      break;
    case "updated":
    default:
      orderBy = { updatedAt: "desc" };
      break;
  }

  const [rows, total] = await Promise.all([
    prisma.playlist.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      select: {
        playlistId: true,
        title: true,
        thumbnailUrl: true,
        channelTitle: true,
        itemCount: true,
        isActive: true,
        updatedAt: true,
        syncInProgress: true,
        lastSyncResult: true,
        slug: true,
      },
    }),
    prisma.playlist.count({ where }),
  ]);

  return res.status(200).json({
    success: true,
    playlists: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.max(1, Math.ceil(total / limitNum)),
    },
  });
}

export default handler;
