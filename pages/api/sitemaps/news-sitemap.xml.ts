// pages/api/sitemaps/news-sitemap.xml.ts
import { NextApiRequest, NextApiResponse } from "next";
import { format, isWithinInterval, subDays, subMonths } from "date-fns";
import keyword_extractor from "keyword-extractor";
import { formatSitemapDate } from "@/lib/sitemap-cache";

const fetchAndCombineSitemaps = async (urls: string[]) => {
  let urlSetContent = "";
  const twoDaysAgo = subDays(new Date(), 2); // Google News requires articles < 2 days old

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) continue;

      const sitemapContent = await response.text();
      const urlMatches = sitemapContent.match(/<url>[\s\S]*?<\/url>/g) || [];

      for (const urlMatch of urlMatches) {
        const locMatch = urlMatch.match(/<loc>(.*?)<\/loc>/);
        if (!locMatch) continue;

        const urlDate = parseDateFromUrl(locMatch[1]);
        if (
          urlDate &&
          isWithinInterval(urlDate, { start: twoDaysAgo, end: new Date() })
        ) {
          const urlPath = locMatch[1];
          const isBahasa = urlPath.includes("bahasa");
          const language = isBahasa ? "ms" : "en";

          const urlSegments = urlPath.split("/");
          const categoryIndex = urlSegments.findIndex(
            (part) => part === "category"
          );
          const f_genre =
            categoryIndex !== -1 ? urlSegments[categoryIndex + 1] : "news";

          const lastSegment = urlSegments[urlSegments.length - 1];
          const titleFromURL =
            lastSegment
              ?.split("-")
              ?.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ") || "News Article";

          const extraction_result = keyword_extractor.extract(titleFromURL, {
            language: language === "ms" ? "english" : "english", // keyword-extractor doesn't support Malay
            remove_digits: true,
            return_changed_case: true,
            remove_duplicates: true,
          });

          const publicationDateMatch = urlMatch.match(
            /<lastmod>(.*?)<\/lastmod>/
          );
          const publicationDate = publicationDateMatch
            ? formatSitemapDate(new Date(publicationDateMatch[1]))
            : formatSitemapDate(urlDate);

          const extractedKeywords = Array.isArray(extraction_result)
            ? extraction_result.slice(0, 10).join(", ")
            : "";

          const baseKeywords =
            language === "ms"
              ? "malaysia, berita, tempatan, terkini"
              : `malaysia, ${f_genre}, news, latest`;

          const keywords = `${baseKeywords}${extractedKeywords ? `, ${extractedKeywords}` : ""}`;

          // Build the news-specific URL entry
          urlSetContent += `    <url>
      <loc>${urlPath}</loc>
      <news:news>
        <news:publication>
          <news:name>Free Malaysia Today</news:name>
          <news:language>${language}</news:language>
        </news:publication>
        <news:publication_date>${publicationDate}</news:publication_date>
        <news:title><![CDATA[${titleFromURL}]]></news:title>
        <news:keywords><![CDATA[${keywords}]]></news:keywords>
      </news:news>
    </url>\n`;
        }
      }
    } catch (error) {
      console.error(`Error fetching sitemap ${url}:`, error);
      continue;
    }
  }

  return generateFinalSitemap(urlSetContent);
};

const parseDateFromUrl = (url: string): Date | null => {
  const urlDateMatch = url.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (!urlDateMatch) return null;

  const [, year, month, day] = urlDateMatch;
  const date = new Date(Date.UTC(+year, +month - 1, +day));

  if (isNaN(date.getTime())) return null;
  return date;
};

const generateFinalSitemap = (urlSetContent: string) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlSetContent}</urlset>`;
};

const getCurrentAndPreviousYearMonth = () => {
  const currentDate = new Date();
  const previousDate = subMonths(currentDate, 1);
  return [format(currentDate, "yyyyMM"), format(previousDate, "yyyyMM")];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const [currentYearMonth, previousYearMonth] =
    getCurrentAndPreviousYearMonth();

  // Include current and previous month for better coverage
  const sitemapUrls = [
    `https://cms.freemalaysiatoday.com/sitemap-posttype-post.${currentYearMonth}.xml`,
    `https://cms.freemalaysiatoday.com/sitemap-posttype-post.${previousYearMonth}.xml`,
  ];

  try {
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=900, s-maxage=900"); // 15 minutes cache

    const combinedSitemap = await fetchAndCombineSitemaps(sitemapUrls);
    res.write(combinedSitemap);
    res.end();
  } catch (err) {
    console.error("[SITEMAP_ERROR] News sitemap error:", err);
    res.status(500).send(`[SITEMAP_ERROR] News sitemap error: ${err}`);
  }
}
