// pages/api/feeds/shorts.xml.ts
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

    // Fetch latest shorts videos
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
      take: 50, // RSS feeds typically show 10-50 items
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
      },
    });

    // Generate RSS XML with Media RSS namespace for video content
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:sy="http://purl.org/rss/1.0/modules/syndication/">
  <channel>
    <title>FMT Shorts - Latest Malaysia News Videos</title>
    <link>https://www.freemalaysiatoday.com/videos/shorts</link>
    <description>Quick news updates from Malaysia. Breaking stories, politics, business, and lifestyle in bite-sized videos.</description>
    <language>en-MY</language>
    <copyright>Copyright © ${new Date().getFullYear()} Free Malaysia Today</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>15</ttl>
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>4</sy:updateFrequency>
    <atom:link href="https://www.freemalaysiatoday.com/api/feeds/shorts.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>https://www.freemalaysiatoday.com/logo.png</url>
      <title>FMT Shorts</title>
      <link>https://www.freemalaysiatoday.com</link>
    </image>
    <generator>FMT RSS Generator v2.0</generator>
    ${videos
      .map((video) => {
        const thumbnailUrl =
          video.thumbnails?.maxres ||
          video.thumbnails?.high ||
          `https://i.ytimg.com/vi/${video.videoId}/frame0.jpg`;

        const duration = parseDuration(
          video.contentDetails?.duration || "PT0S"
        );
        const viewCount = Number(video.statistics?.viewCount || 0);
        const likeCount = Number(video.statistics?.likeCount || 0);

        return `
    <item>
      <title><![CDATA[${video.title}]]></title>
      <link>https://www.freemalaysiatoday.com/videos/${video.videoId}</link>
      <guid isPermaLink="true">https://www.freemalaysiatoday.com/videos/${video.videoId}</guid>
      <description><![CDATA[${video.description || video.title}]]></description>
      <content:encoded><![CDATA[
        <div>
          <a href="https://www.freemalaysiatoday.com/videos/${video.videoId}">
            <img src="${thumbnailUrl}" alt="${escapeHtml(video.title)}" style="width:100%;max-width:600px;height:auto;" />
          </a>
          <p>${escapeHtml(video.description || video.title)}</p>
          <p><strong>Duration:</strong> ${duration.formatted}</p>
          <p><strong>Views:</strong> ${viewCount.toLocaleString()}</p>
          <p><a href="https://www.freemalaysiatoday.com/videos/${video.videoId}">Watch Video</a></p>
        </div>
      ]]></content:encoded>
      <pubDate>${new Date(video.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${video.channelTitle || "Free Malaysia Today"}</dc:creator>
      <category>Shorts</category>
      ${
        video.tags
          ?.slice(0, 5)
          .map((tag) => `<category>${escapeXml(tag)}</category>`)
          .join("\n      ") || ""
      }
      
      <!-- Media RSS for video content -->
      <media:content 
        url="https://www.youtube.com/watch?v=${video.videoId}"
        type="video/mp4"
        medium="video"
        duration="${duration.seconds}">
        <media:title><![CDATA[${video.title}]]></media:title>
        <media:description><![CDATA[${video.description || video.title}]]></media:description>
        <media:thumbnail url="${thumbnailUrl}" width="1280" height="720" />
        <media:player url="https://www.youtube.com/embed/${video.videoId}" />
        <media:statistics views="${viewCount}" />
        <media:rating scheme="urn:simple">likes</media:rating>
        <media:rating>${likeCount}</media:rating>
        <media:keywords>${video.tags?.join(", ") || "malaysia, news, shorts"}</media:keywords>
        <media:credit role="publisher">${video.channelTitle || "Free Malaysia Today"}</media:credit>
      </media:content>
      
      <enclosure 
        url="${thumbnailUrl}" 
        type="image/jpeg" 
        length="0" />
    </item>`;
      })
      .join("")}
  </channel>
</rss>`;

    // Set appropriate headers
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=900, s-maxage=1800"); // 15 min client, 30 min CDN
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(rss);
  } catch (error) {
    console.error("[RSS Feed] Error:", error);
    return res.status(500).send("Error generating RSS feed");
  }
}

// Helper function to parse duration
function parseDuration(duration: string): {
  seconds: number;
  formatted: string;
} {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { seconds: 0, formatted: "0:00" };

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  let formatted = "";
  if (hours > 0) {
    formatted = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return { seconds: totalSeconds, formatted };
}

// Helper function to escape XML
function escapeXml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
