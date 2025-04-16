import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware function to handle cache settings and tags
 * Optimized for high-frequency news publishing with better path detection
 * Includes debug headers for easier troubleshooting
 */

// Define content types with appropriate cache durations for news site
const cacheDurations = {
  static: {
    maxAge: 31536000, // 1 year for truly static content
    staleWhileRevalidate: 0,
    staleIfError: 0,
  },
  article: {
    maxAge: 30, // 30 seconds for article detail pages
    staleWhileRevalidate: 300, // 5 minutes SWR
    staleIfError: 1800, // 30 minutes SIE
  },
  collection: {
    maxAge: 20, // 20 seconds for category collection pages
    staleWhileRevalidate: 120, // 2 minutes SWR
    staleIfError: 600, // 10 minutes SIE
  },
  listing: {
    maxAge: 20, // 20 seconds for section listing pages
    staleWhileRevalidate: 120, // 2 minutes SWR
    staleIfError: 600, // 10 minutes SIE
  },
  homepage: {
    maxAge: 15, // 15 seconds for homepage
    staleWhileRevalidate: 60, // 1 minute SWR
    staleIfError: 300, // 5 minutes SIE
  },
};

// Improved content type detection with better path analysis
function getContentType(
  pathname: string
): "static" | "article" | "collection" | "listing" | "homepage" {
  if (pathname === "/") return "homepage";

  // Check for article detail pages - they have a date pattern in the URL
  // Pattern: /category/something/YYYY/MM/DD/slug/ or /category/something/subcategory/YYYY/MM/DD/slug/
  if (
    pathname.includes("/category/") &&
    /\/\d{4}\/\d{2}\/\d{2}\//.test(pathname)
  ) {
    return "article";
  }

  // Check for category collection pages
  // Pattern: /category/category/something/ or /category/something/
  if (pathname.includes("/category/")) {
    return "collection";
  }

  // Check for main section pages
  if (
    pathname.match(
      /^\/(news|berita|business|opinion|world|sports|lifestyle|photos|videos|accelerator)\/?$/
    )
  ) {
    return "listing";
  }

  return "static";
}

// Apply cache tags based on path with improved detection for multi-level categories
function applyCacheTags(response: NextResponse, pathname: string): string[] {
  const cacheTags = [];

  // Always add page-specific tag for precise purging
  cacheTags.push(`path:${pathname}`);

  // Add hierarchical tags for more granular control
  if (pathname === "/") {
    cacheTags.push("page:home");
  } else if (
    pathname.match(
      /^\/(news|berita|business|opinion|world|sports|lifestyle|photos|videos|accelerator)\/?$/
    )
  ) {
    const section = pathname.split("/")[1];
    cacheTags.push(`section:${section}`);
    cacheTags.push("type:listing");
  } else if (pathname.includes("/category/")) {
    // Extract category information
    const pathParts = pathname.split("/").filter(Boolean);
    const categoryIndex = pathParts.indexOf("category");

    if (categoryIndex !== -1 && pathParts.length > categoryIndex + 1) {
      // Get the main category (first level after /category/)
      const category = pathParts[categoryIndex + 1];
      cacheTags.push(`category:${category}`);

      // Check if this is an article detail page by looking for date pattern
      const isArticlePage = /\/\d{4}\/\d{2}\/\d{2}\//.test(pathname);

      // Find the date pattern index to determine subcategory structure
      let datePatternIndex = -1;
      for (let i = 0; i < pathParts.length; i++) {
        if (
          /^\d{4}$/.test(pathParts[i]) &&
          i + 2 < pathParts.length &&
          /^\d{2}$/.test(pathParts[i + 1]) &&
          /^\d{2}$/.test(pathParts[i + 2])
        ) {
          datePatternIndex = i;
          break;
        }
      }

      // Handle subcategories - all path parts between category and date pattern
      if (datePatternIndex > 0) {
        // Add all subcategory levels
        for (let i = categoryIndex + 2; i < datePatternIndex; i++) {
          if (i < pathParts.length) {
            cacheTags.push(`subcategory:${pathParts[i]}`);
            // Also add combined category path for more precise targeting
            if (i === categoryIndex + 2) {
              cacheTags.push(`category-path:${category}/${pathParts[i]}`);
            } else if (i === categoryIndex + 3) {
              cacheTags.push(
                `category-path:${category}/${pathParts[i - 1]}/${pathParts[i]}`
              );
            }
          }
        }
      } else if (pathParts.length > categoryIndex + 2) {
        // For collection pages with subcategories
        cacheTags.push(`subcategory:${pathParts[categoryIndex + 2]}`);
        cacheTags.push(
          `category-path:${category}/${pathParts[categoryIndex + 2]}`
        );
      }

      // Add content type tag
      if (isArticlePage) {
        cacheTags.push("type:article");

        // Add date-based tags for article pages
        const datePattern = /\/(\d{4})\/(\d{2})\/(\d{2})\//;
        const dateMatch = pathname.match(datePattern);
        if (dateMatch) {
          const [_, year, month, day] = dateMatch;
          cacheTags.push(`date:${year}-${month}-${day}`);
          cacheTags.push(`year:${year}`);
          cacheTags.push(`month:${year}-${month}`);
        }
      } else {
        cacheTags.push("type:collection");
      }
    }
  }

  // Join all tags and set the Cache-Tag header
  response.headers.set("Cache-Tag", cacheTags.join(","));

  return cacheTags;
}

export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next();

  // Get the pathname
  const { pathname } = request.nextUrl;

  // Add debug header for request path
  response.headers.set("X-Debug-Path", pathname);

  // Skip middleware caching logic for video slug pages
  if (/^\/videos\/.+/.test(pathname)) {
    response.headers.set("X-Debug-Skip-Reason", "video-page");
    return response;
  }

  // Skip for API routes except for revalidate (which needs custom headers)
  if (pathname.startsWith("/api/") && !pathname.includes("/api/revalidate")) {
    response.headers.set("X-Debug-Skip-Reason", "api-route");
    return response;
  }

  // Check if user is logged in (has auth cookie)
  const hasAuthCookie = request.cookies.has("auth_token");
  response.headers.set(
    "X-Debug-Auth",
    hasAuthCookie ? "logged-in" : "anonymous"
  );

  // For static assets, implement a smarter caching strategy
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico|js|css)$/.test(pathname)) {
    const isArticleImage =
      pathname.includes("/wp-content/uploads/") &&
      request.headers.get("referer")?.includes("/category/");

    if (isArticleImage) {
      // For images that might be updated (like article featured images)
      response.headers.set(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=3600"
      );
      response.headers.set(
        "Cloudflare-CDN-Cache-Control",
        "public, max-age=300, stale-while-revalidate=3600"
      );
      response.headers.set("X-Debug-Asset-Type", "article-image");
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
      response.headers.set("X-Debug-Asset-Type", "static-asset");
    }

    return response;
  }

  // For HTML content, apply different strategies based on content type and user state
  const contentType = getContentType(pathname);
  const { maxAge, staleWhileRevalidate, staleIfError } =
    cacheDurations[contentType];

  // Add debug headers for content type and cache durations
  response.headers.set("X-Debug-Content-Type", contentType);
  response.headers.set("X-Debug-Cache-MaxAge", maxAge.toString());
  response.headers.set("X-Debug-Cache-SWR", staleWhileRevalidate.toString());
  response.headers.set("X-Debug-Cache-SIE", staleIfError.toString());

  // For logged-in users, use shorter or no caching
  if (hasAuthCookie) {
    response.headers.set("Cache-Control", "private, no-cache");
    response.headers.set("Cloudflare-CDN-Cache-Control", "private, no-cache");
    response.headers.set("X-Debug-Cache-Policy", "private-no-cache");
  } else {
    // For anonymous users, use the tiered caching strategy
    const cacheControlValue = `public, max-age=${maxAge}${staleWhileRevalidate ? `, stale-while-revalidate=${staleWhileRevalidate}` : ""}${staleIfError ? `, stale-if-error=${staleIfError}` : ""}`;

    response.headers.set("Cache-Control", cacheControlValue);
    response.headers.set("Cloudflare-CDN-Cache-Control", cacheControlValue);
    response.headers.set("X-Debug-Cache-Policy", "tiered-public");

    // Apply cache tags and add debug header
    const cacheTags = applyCacheTags(response, pathname);
    response.headers.set("X-Debug-Cache-Tags", cacheTags.join(","));
    response.headers.set(
      "X-Debug-Cache-Tag-Count",
      cacheTags.length.toString()
    );
  }

  // Add version header for client-side detection of fresh content
  // Update every 10 seconds for high-frequency news site
  const versionTimestamp = Math.floor(Date.now() / 10000) * 10000;
  response.headers.set("x-fmt-version", versionTimestamp.toString());
  response.headers.set(
    "X-Debug-Version-Timestamp",
    versionTimestamp.toString()
  );

  // Standard Vary header
  response.headers.set("Vary", "Accept-Encoding, Cookie, User-Agent");

  // Add middleware version header for tracking deployments
  response.headers.set("X-Middleware-Version", "1.0.0");

  return response;
}

// Configure which paths this middleware runs on
export const config = {
  matcher: [
    // Match all paths except Next.js internals and API routes (except revalidate)
    "/((?!_next/static|_next/image|favicon.ico|api/(?!revalidate)).*)",
  ],
};
