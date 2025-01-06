import { calculateCacheDuration } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export async function fetchMostViewed() {
  try {
    const mostViewedData = await prisma.mostViewed.findMany();
    return mostViewedData.map((item: any) => ({
      ...item,
      date: item.date.toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching most viewed data:", error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const cacheDuration = calculateCacheDuration();
    const mostViewedData = await fetchMostViewed();

    res.setHeader(
      "Cache-Control",
      `s-maxage=${cacheDuration}, stale-while-revalidate=60`
    );

    return res.status(200).json(mostViewedData);
  } catch (error) {
    console.error("Error in most viewed API:", error);
    return res.status(500).json({
      error: "Failed to fetch most viewed data",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}
