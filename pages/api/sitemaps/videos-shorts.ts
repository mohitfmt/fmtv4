// pages/api/sitemap/videos-shorts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get the shorts playlist configuration
    const videoConfig = await prisma.videoConfig.findFirst();

    if (!videoConfig || !videoConfig.shortsPlaylist) {
      return res.status(404).send("Shorts configuration not found");
    }

    // Fetch all shorts videos
    const videos = await prisma.videos.findMany({
      where: {
        playlists: {
          has: videoConfig.shortsPlaylist,
        },
        isActive: true,
        status: {
          is: {
            privacyStatus: "public",
            uploadStatus: "processed",
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: 1000, // Google recommends max 50,000 URLs per sitemap
      select: {
        videoId: true,
        title: true,
        description: true,
        publishedAt: true,
        channelTitle: true,
        thumbnails: true,
        contentDetails: true,
        statistics: true,
        tags: true,
        tier: true,
      },
    });

    // Generate video sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${videos
    .map((video) => {
      const thumbnailUrl =
        video.thumbnails?.maxres ||
        video.thumbnails?.high ||
        `https://i.ytimg.com/vi/${video.videoId}/frame0.jpg`;

      const duration = parseDurationToSeconds(
        video.contentDetails?.duration || "PT0S"
      );
      const viewCount = Number(video.statistics?.viewCount || 0);

      // Calculate priority based on tier and recency
      const ageInDays = Math.floor(
        (Date.now() - new Date(video.publishedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      let priority = 0.5;
      if (video.tier === "hot" || video.tier === "trending") priority = 0.9;
      else if (ageInDays < 1) priority = 0.8;
      else if (ageInDays < 7) priority = 0.7;
      else if (ageInDays < 30) priority = 0.6;

      return `
  <url>
    <loc>https://www.freemalaysiatoday.com/videos/${video.videoId}</loc>
    <lastmod>${new Date(video.publishedAt).toISOString()}</lastmod>
    <changefreq>${ageInDays < 7 ? "daily" : "weekly"}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(video.title)}</video:title>
      <video:description>${escapeXml(video.description?.substring(0, 2048) || video.title)}</video:description>
      <video:player_loc>https://www.youtube.com/embed/${video.videoId}</video:player_loc>
      <video:duration>${duration}</video:duration>
      <video:view_count>${viewCount}</video:view_count>
      <video:publication_date>${new Date(video.publishedAt).toISOString()}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:live>no</video:live>
      <video:requires_subscription>no</video:requires_subscription>
      <video:uploader info="https://www.freemalaysiatoday.com">
        ${escapeXml(video.channelTitle || "Free Malaysia Today")}
      </video:uploader>
      ${
        video.tags && video.tags.length > 0
          ? video.tags
              .slice(0, 32)
              .map((tag) => `<video:tag>${escapeXml(tag)}</video:tag>`)
              .join("\n      ")
          : "<video:tag>malaysia</video:tag>\n      <video:tag>news</video:tag>\n      <video:tag>shorts</video:tag>"
      }
      <video:category>News</video:category>
    </video:video>
  </url>`;
    })
    .join("")}
</urlset>`;

    // Set appropriate headers
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=7200");
    res.setHeader("X-Robots-Tag", "noindex"); // Sitemaps shouldn't be indexed themselves

    return res.status(200).send(sitemap);
  } catch (error) {
    console.error("[Video Sitemap] Error:", error);
    return res.status(500).send("Error generating sitemap");
  }
}

// Helper function to parse ISO 8601 duration to seconds
function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

// Helper function to escape XML special characters
function escapeXml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/[\x00-\x1F]/g, ""); // Remove control characters
}
