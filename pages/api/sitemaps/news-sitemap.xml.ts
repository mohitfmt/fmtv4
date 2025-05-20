import { NextApiRequest, NextApiResponse } from "next";
import {
  format,
  isWithinInterval,
  parseISO,
  subDays,
  subMonths,
} from "date-fns";
import keyword_extractor from "keyword-extractor";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const [currentYearMonth, previousYearMonth] =
    getCurrentAndPreviousYearMonth();
  const sitemapUrls = [
    `https://cms.freemalaysiatoday.com/sitemap-posttype-post.${currentYearMonth}.xml`,
  ];

  try {
    const combinedSitemap = await fetchAndCombineSitemaps(sitemapUrls);
    res.setHeader("Content-Type", "application/xml");
    res.write(combinedSitemap);
    res.end();
  } catch (err) {
    console.error(
      "[SITEMAP_API_ERROR] News Sitemap Internal Server Error : ",
      err
    );
    res
      .status(500)
      .send(`[SITEMAP_API_ERROR] News Sitemap Internal Server Error : ${err}`);
  }
}

const fetchAndCombineSitemaps = async (urls: string[]) => {
  let urlSetContent = "";
  const twoDaysAgo = subDays(new Date(), 3);

  for (const url of urls) {
    const response = await fetch(url, { cache: "no-store" });
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
        let genresTag = "";
        const locMatch = urlMatch.match(/<loc>(.*?)<\/loc>/);
        const urlPath = locMatch ? locMatch[1] : "";
        const isBahasa = urlPath.includes("bahasa");
        const language = isBahasa ? "ms" : "en";
        let keywords = "";
        const urlSegments = urlPath.split("/");
        const categoryIndex = urlSegments.findIndex(
          (part) => part === "category"
        );
        const f_genre =
          categoryIndex !== -1 ? urlSegments[categoryIndex + 1] : "";
        const lastSegment = urlSegments[urlSegments.length - 2];
        const titleFromURL = lastSegment
          ?.split("-")
          ?.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        const extraction_result = keyword_extractor.extract(titleFromURL, {
          language: "english",
          remove_digits: true,
          return_changed_case: true,
          remove_duplicates: true,
        });
        const publicationDateMatch = urlMatch.match(
          /<lastmod>(.*?)<\/lastmod>/
        );
        const publicationDate = publicationDateMatch
          ? publicationDateMatch[1]
          : "";

        const genreMappings: { [key: string]: string } = {
          nation: "PressRelease",
          bahasa: "PressRelease",
          opinion: "Opinion",
          world: "PressRelease",
          business: "PressRelease",
          sports: "PressRelease",
          leisure: "Blog",
          default: "UserGenerated",
        };

        const extractedKeywords = Array.isArray(extraction_result)
          ? extraction_result.join(", ")
          : "";

        const baseKeywords =
          language === "ms"
            ? `malaysia berita, berita, Malaysia, tempatan, local, news, malaysia news, local news, local malaysian news, bahasa, Berita Utama`
            : `${f_genre} news`;
        keywords = `${baseKeywords}, ${extractedKeywords}`;

        const genreKey = f_genre.toLowerCase();
        genresTag = `<news:genres>${genreMappings[genreKey] || genreMappings["default"]}</news:genres>`;

        const regLastMod = /<lastmod>(.*?)<\/lastmod>/;

        urlSetContent += urlMatch
          .replace(
            "<priority>0.9</priority>",
            `<news:news>
              <news:publication>
                <news:name>Free Malaysia Today</news:name>
                <news:language>${language}</news:language>
              </news:publication>
              <news:publication_date>${new Date(publicationDate).toISOString()}</news:publication_date>
              <news:title>${titleFromURL}</news:title>
              <news:keywords>${keywords}</news:keywords>
              ${genresTag}
            </news:news>`
          )
          .replace(regLastMod, "");
      }
    }
  }

  return generateFinalSitemap(urlSetContent);
};

const parseDateFromUrl = (url: string) => {
  const urlDateMatch = url.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  return urlDateMatch
    ? parseISO(`${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}`)
    : null;
};

const generateFinalSitemap = (urlSetContent: any) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" 
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlSetContent}
</urlset>`;
};

const getCurrentAndPreviousYearMonth = () => {
  const currentDate = new Date();
  const previousDate = subMonths(currentDate, 1);
  return [format(currentDate, "yyyyMM"), format(previousDate, "yyyyMM")];
};
