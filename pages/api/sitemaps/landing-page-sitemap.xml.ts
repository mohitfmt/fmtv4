// pages/api/sitemaps/landing-page-sitemap.xml.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { categoryLastModCache, formatSitemapDate } from "@/lib/sitemap-cache";

// Complete category configuration with all URLs
const CATEGORY_CONFIG = {
  // Primary pages (canonical URLs)
  primary: [
    {
      loc: "https://www.freemalaysiatoday.com",
      changefreq: "always",
      priority: 1.0,
      category: null, // Homepage
    },
    {
      loc: "https://www.freemalaysiatoday.com/news",
      changefreq: "always",
      priority: 0.9,
      category: "nation",
    },
    {
      loc: "https://www.freemalaysiatoday.com/berita",
      changefreq: "always",
      priority: 0.9,
      category: "bahasa",
    },
    {
      loc: "https://www.freemalaysiatoday.com/business",
      changefreq: "hourly",
      priority: 0.8,
      category: "business",
    },
    {
      loc: "https://www.freemalaysiatoday.com/lifestyle",
      changefreq: "hourly",
      priority: 0.8,
      category: "leisure",
    },
    {
      loc: "https://www.freemalaysiatoday.com/opinion",
      changefreq: "daily",
      priority: 0.8,
      category: "opinion",
    },
    {
      loc: "https://www.freemalaysiatoday.com/sports",
      changefreq: "hourly",
      priority: 0.8,
      category: "sports",
    },
  ],

  // Subcategory pages
  subcategories: [
    // Nation subcategories
    {
      loc: "https://www.freemalaysiatoday.com/category/category/nation/sabahsarawak",
      changefreq: "hourly",
      priority: 0.7,
      category: "sabahsarawak",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/south-east-asia",
      changefreq: "hourly",
      priority: 0.7,
      category: "south-east-asia",
    },
    // Bahasa subcategories
    {
      loc: "https://www.freemalaysiatoday.com/category/category/bahasa/tempatan",
      changefreq: "hourly",
      priority: 0.7,
      category: "tempatan",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/bahasa/pandangan",
      changefreq: "daily",
      priority: 0.7,
      category: "pandangan",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/bahasa/dunia",
      changefreq: "hourly",
      priority: 0.7,
      category: "dunia",
    },
    // Business subcategories
    {
      loc: "https://www.freemalaysiatoday.com/category/category/business/world-business",
      changefreq: "hourly",
      priority: 0.7,
      category: "world-business",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/business/local-business",
      changefreq: "hourly",
      priority: 0.7,
      category: "local-business",
    },
    // Leisure/Lifestyle subcategories
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure",
      changefreq: "hourly",
      priority: 0.7,
      category: "leisure",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure/simple-stories",
      changefreq: "daily",
      priority: 0.6,
      category: "simple-stories",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure/food",
      changefreq: "daily",
      priority: 0.6,
      category: "food",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure/entertainment",
      changefreq: "daily",
      priority: 0.6,
      category: "entertainment",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure/health",
      changefreq: "daily",
      priority: 0.6,
      category: "health",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure/money",
      changefreq: "daily",
      priority: 0.6,
      category: "money",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure/travel",
      changefreq: "weekly",
      priority: 0.6,
      category: "travel",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure/tech",
      changefreq: "daily",
      priority: 0.6,
      category: "tech",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure/pets",
      changefreq: "weekly",
      priority: 0.5,
      category: "pets",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure/automotive",
      changefreq: "daily",
      priority: 0.6,
      category: "automotive",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/leisure/property",
      changefreq: "daily",
      priority: 0.6,
      category: "property",
    },
    // Opinion subcategories
    {
      loc: "https://www.freemalaysiatoday.com/category/category/opinion/editorial",
      changefreq: "daily",
      priority: 0.7,
      category: "editorial",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/opinion/column",
      changefreq: "daily",
      priority: 0.7,
      category: "column",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/opinion/letters",
      changefreq: "daily",
      priority: 0.6,
      category: "letters",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/fmt-worldviews",
      changefreq: "daily",
      priority: 0.7,
      category: "fmt-worldviews",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/world",
      changefreq: "hourly",
      priority: 0.8,
      category: "world",
    },
    // Sports subcategories
    {
      loc: "https://www.freemalaysiatoday.com/category/category/sports",
      changefreq: "hourly",
      priority: 0.7,
      category: "sports",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/sports/football",
      changefreq: "hourly",
      priority: 0.7,
      category: "football",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/sports/badminton",
      changefreq: "hourly",
      priority: 0.7,
      category: "badminton",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/sports/motorsports",
      changefreq: "daily",
      priority: 0.6,
      category: "motorsports",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/sports/tennis",
      changefreq: "daily",
      priority: 0.6,
      category: "tennis",
    },
    {
      loc: "https://www.freemalaysiatoday.com/category/category/education",
      changefreq: "weekly",
      priority: 0.6,
      category: "education",
    },
  ],

  // Static pages
  static: [
    {
      loc: "https://www.freemalaysiatoday.com/contact-us",
      changefreq: "yearly",
      priority: 0.3,
    },
    {
      loc: "https://www.freemalaysiatoday.com/about",
      changefreq: "monthly",
      priority: 0.4,
    },
    {
      loc: "https://www.freemalaysiatoday.com/advertise",
      changefreq: "monthly",
      priority: 0.3,
    },
    {
      loc: "https://www.freemalaysiatoday.com/disclaimers-copyright",
      changefreq: "yearly",
      priority: 0.2,
    },
    {
      loc: "https://www.freemalaysiatoday.com/privacy-policy",
      changefreq: "monthly",
      priority: 0.3,
    },
  ],

  // Special sections
  special: [
    {
      loc: "https://www.freemalaysiatoday.com/photos",
      changefreq: "weekly", // Changed from daily as requested
      priority: 0.6,
      category: "photos",
    },
    {
      loc: "https://www.freemalaysiatoday.com/videos",
      changefreq: "hourly",
      priority: 0.8,
      category: "videos",
    },
    {
      loc: "https://www.freemalaysiatoday.com/accelerator",
      changefreq: "weekly",
      priority: 0.5,
    },
  ],
};

// Helper function to get last modified date for categories with caching
async function getCategoryLastModified(
  categorySlug: string | null
): Promise<string> {
  if (!categorySlug) {
    return formatSitemapDate(new Date());
  }

  // Check cache first
  const cached = categoryLastModCache.get(categorySlug);
  if (cached) {
    return cached;
  }

  try {
    const variables = {
      first: 1,
      where: {
        status: "PUBLISH",
        taxQuery: {
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: [categorySlug],
            },
          ],
        },
      },
    };

    const response = await getFilteredCategoryPosts(variables);

    if (response?.posts?.edges?.[0]?.node?.dateGmt) {
      const lastmod = formatSitemapDate(
        new Date(response.posts.edges[0].node.dateGmt + "Z")
      );
      categoryLastModCache.set(categorySlug, lastmod);
      return lastmod;
    }
  } catch (error) {
    console.error(
      `Error fetching lastmod for category ${categorySlug}:`,
      error
    );
  }

  // Fallback based on changefreq
  const fallbackTimes: Record<string, number> = {
    always: 0,
    hourly: 1 * 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    yearly: 365 * 24 * 60 * 60 * 1000,
  };

  const item = [
    ...CATEGORY_CONFIG.primary,
    ...CATEGORY_CONFIG.subcategories,
    ...CATEGORY_CONFIG.special,
  ].find((i) => "category" in i && i.category === categorySlug);

  const changefreq = item?.changefreq || "daily";
  const lastmod = formatSitemapDate(
    new Date(Date.now() - (fallbackTimes[changefreq] || 0))
  );

  categoryLastModCache.set(categorySlug, lastmod);
  return lastmod;
}

// Generate URL entry
function generateUrlEntry(
  loc: string,
  lastmod: string,
  changefreq: string,
  priority: number
): string {
  return `    <url>
      <loc>${loc}</loc>
      <lastmod>${lastmod}</lastmod>
      <changefreq>${changefreq}</changefreq>
      <priority>${priority.toFixed(1)}</priority>
    </url>`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    res.setHeader("Content-Type", "application/xml");
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=600"
    );

    const urlEntries: string[] = [];

    // Process all categories in parallel for better performance
    const processCategory = async (page: any) => {
      const lastmod =
        page.category !== undefined
          ? await getCategoryLastModified(page.category)
          : formatSitemapDate(new Date());
      return generateUrlEntry(
        page.loc,
        lastmod,
        page.changefreq,
        page.priority
      );
    };

    // Process all pages
    const allPages = [
      ...CATEGORY_CONFIG.primary,
      ...CATEGORY_CONFIG.subcategories,
      ...CATEGORY_CONFIG.special,
    ];

    const dynamicEntries = await Promise.all(allPages.map(processCategory));
    urlEntries.push(...dynamicEntries);

    // Process static pages
    const staticLastmod = "2024-01-01T00:00:00.000Z";
    for (const page of CATEGORY_CONFIG.static) {
      urlEntries.push(
        generateUrlEntry(
          page.loc,
          staticLastmod,
          page.changefreq,
          page.priority
        )
      );
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;

    res.write(sitemap);
    res.end();
  } catch (err) {
    console.error("[SITEMAP_ERROR] Landing page sitemap error:", err);

    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://www.freemalaysiatoday.com</loc>
      <lastmod>${formatSitemapDate(new Date())}</lastmod>
      <changefreq>always</changefreq>
      <priority>1.0</priority>
    </url>
</urlset>`;

    res.write(fallbackSitemap);
    res.end();
  }
}
