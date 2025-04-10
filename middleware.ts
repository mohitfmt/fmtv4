// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Gets current time in Malaysia timezone (UTC+8)
 * This function handles timezone conversion properly regardless of server location
 * @returns Date object representing the current time in Malaysia
 */
function getMalaysiaTime(): Date {
  const now = new Date();

  // Get UTC time in milliseconds
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;

  // Malaysia timezone offset (UTC+8 = +480 minutes)
  const malaysiaOffset = 8 * 60;

  // Malaysia time in milliseconds
  const malaysiaTime = utcTime + malaysiaOffset * 60000;

  // Return Malaysia time
  return new Date(malaysiaTime);
}

/**
 * Next.js middleware function to handle cache settings and tags
 * Optimized for Cloudflare Enterprise with Cache Tags
 */
export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next();

  // Get the pathname
  const { pathname } = request.nextUrl;

  // Skip middleware caching logic for video slug pages
  if (/^\/videos\/.+/.test(pathname)) {
    return response;
  }

  // Skip for API routes except for revalidate (which needs custom headers)
  if (pathname.startsWith("/api/") && !pathname.includes("/api/revalidate")) {
    return response;
  }

  // For static assets, implement a smarter caching strategy
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico|js|css)$/.test(pathname)) {
    // Parse the URL to check if it's an image in a post context
    const isArticleImage =
      pathname.includes("/wp-content/uploads/") &&
      request.headers.get("referer")?.includes("/category/");

    if (isArticleImage) {
      // For images that might be updated, use shorter cache with revalidation
      response.headers.set(
        "Cache-Control",
        "public, max-age=3600, stale-while-revalidate=86400"
      );

      response.headers.set(
        "Cloudflare-CDN-Cache-Control",
        "public, max-age=3600, stale-while-revalidate=86400"
      );
    } else {
      // Other static assets get long-term caching
      response.headers.set(
        "Cache-Control",
        "public, max-age=31536000, immutable"
      );

      response.headers.set(
        "Cloudflare-CDN-Cache-Control",
        "public, max-age=31536000, immutable"
      );
    }

    return response;
  }

  // Identify dynamic content pages - expanded to cover all navigation sections
  const isDynamicContent =
    pathname.includes("/category/") ||
    pathname === "/" ||
    pathname.match(
      /^\/(news|berita|business|opinion|world|sports|lifestyle|photos|videos|accelerator)\/?$/
    );

  // For dynamic content, add cache-busting headers and Cache Tags
  if (isDynamicContent) {
    // Extract meaningful path components for tagging
    const pathParts = pathname.split("/").filter(Boolean);

    // Create appropriate cache tags based on the URL structure
    const cacheTags = [];

    // Always add page-specific tag - this is the most precise tag for targeted purging
    cacheTags.push(`path:${pathname}`);

    // Add section tag if it exists (first path segment for section pages)
    if (pathParts.length > 0) {
      const section = pathParts[0];
      cacheTags.push(`section:${section}`);
    }

    // For category pages, add more specific tags
    if (pathname.includes("/category/")) {
      // Get the main category (usually after /category/)
      const categoryIndex = pathParts.indexOf("category");
      if (categoryIndex !== -1 && pathParts.length > categoryIndex + 1) {
        const category = pathParts[categoryIndex + 1];
        cacheTags.push(`category:${category}`);

        // If there's a subcategory, add that too
        if (pathParts.length > categoryIndex + 2) {
          const subcategory = pathParts[categoryIndex + 2];
          cacheTags.push(`subcategory:${subcategory}`);
        }
      }
    }

    // For article pages, add an article tag and date tags if available
    const isArticlePage =
      pathname.includes("/category/") &&
      pathname.split("/").filter(Boolean).length > 5;
    if (isArticlePage) {
      cacheTags.push("content:article");

      // Try to extract date components if present in the URL
      // Format: /category/section/YYYY/MM/DD/slug/
      const datePattern = /\/category\/[^\/]+\/(\d{4})\/(\d{2})\/(\d{2})\//;
      const dateMatch = pathname.match(datePattern);
      if (dateMatch) {
        const [_, year, month, day] = dateMatch;
        cacheTags.push(`date:${year}-${month}-${day}`);
      }
    }

    // Join all tags and set the Cache-Tag header
    response.headers.set("Cache-Tag", cacheTags.join(","));

    // Set reasonable cache durations - simpler than before
    // Using 10 min for articles, 5 min for categories - balancing freshness and performance
    const isArticle = pathname.includes("/category/");
    const staleDuration = isArticle ? 600 : 300;
    const errorDuration = staleDuration * 2;

    response.headers.set(
      "Cache-Control",
      `max-age=0, stale-while-revalidate=${staleDuration}, stale-if-error=${errorDuration}, public`
    );

    response.headers.set(
      "Cloudflare-CDN-Cache-Control",
      `max-age=0, stale-while-revalidate=${staleDuration}, stale-if-error=${errorDuration}, public`
    );

    // Standard Vary header
    response.headers.set("Vary", "Accept-Encoding, Cookie");

    // Add a version header for client-side detection of fresh content
    response.headers.set("x-fmt-version", Date.now().toString());
  } else {
    // For other pages, use default cache settings
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=1800"
    );

    response.headers.set(
      "Cloudflare-CDN-Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=1800"
    );
  }

  return response;
}

// Configure which paths this middleware runs on
export const config = {
  matcher: [
    // Apply to all pages including images that might need dynamic caching
    // But exclude Next.js static assets and API routes (except revalidate)
    "/((?!_next/static|favicon.ico).*)",
  ],
};
