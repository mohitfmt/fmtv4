import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap>
        <loc>https://www.freemalaysiatoday.com/feeds-sitemap.xml</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
      </sitemap>
      <sitemap>
        <loc>https://www.freemalaysiatoday.com/landing-page-sitemap.xml</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
      </sitemap>
      <sitemap>
        <loc>https://www.freemalaysiatoday.com/news-sitemap.xml</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
      </sitemap>
      <sitemap>
        <loc>https://www.freemalaysiatoday.com/video-sitemap.xml</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
      </sitemap>
    </sitemapindex>`;

    res.setHeader("Content-Type", "application/xml");
    res.write(sitemapIndex);
    res.end();
  } catch (error) {
    console.error(
      "[SITEMAP_API_ERROR] Sitemap-Index Internal Server Error:",
      error
    );
    res
      .status(500)
      .send(
        `[SITEMAP_API_ERROR] Sitemap-Index Internal Server Error : ${error}`
      );
  }
}
