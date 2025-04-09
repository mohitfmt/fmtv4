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
 * Determines the current activity level based on Malaysia time
 * @returns {'low' | 'high' | 'normal'} Activity level
 */
function getActivityLevel(): "low" | "high" | "normal" {
  const malaysiaTime = getMalaysiaTime();
  const hours = malaysiaTime.getHours();
  const minutes = malaysiaTime.getMinutes();

  // Convert current time to minutes since midnight for easier comparison
  const minutesSinceMidnight = hours * 60 + minutes;

  // Define time ranges in minutes since midnight
  const lowActivityStart = 0 * 60 + 30; // 12:30 AM
  const lowActivityEnd = 5 * 60; // 5:00 AM

  const highActivityMorningStart = 8 * 60; // 8:00 AM
  const highActivityMorningEnd = 12 * 60 + 30; // 12:30 AM

  const highActivityEveningStart = 17 * 60 + 30; // 5:30 PM
  const highActivityEveningEnd = 23 * 60 + 30; // 11:30 PM

  // Check if current time falls within low activity period
  if (
    minutesSinceMidnight >= lowActivityStart &&
    minutesSinceMidnight < lowActivityEnd
  ) {
    return "low";
  }

  // Check if current time falls within high activity periods
  if (
    (minutesSinceMidnight >= highActivityMorningStart &&
      minutesSinceMidnight <= highActivityMorningEnd) ||
    (minutesSinceMidnight >= highActivityEveningStart &&
      minutesSinceMidnight <= highActivityEveningEnd)
  ) {
    return "high";
  }

  // Default to normal activity
  return "normal";
}

/**
 * Determine cache duration settings based on content type and activity level
 */
function getCacheDurations(
  pathname: string,
  activityLevel: "low" | "high" | "normal"
): {
  staleDuration: number;
  errorDuration: number;
} {
  // Check if it's a specific article page
  const isArticlePage = pathname.includes("/category/");

  // Set cache durations based on activity level and page type
  switch (activityLevel) {
    case "low":
      // Low Activity period (12:30 AM - 5:00 AM): Very few updates
      return {
        staleDuration: isArticlePage ? 360 : 180, // 1 hour for articles, 30 min for homepage/categories
        errorDuration: isArticlePage ? 720 : 360, // 2 hours for articles, 1 hour for homepage/categories
      };

    case "high":
      // High Activity period (8:00 AM - 11:30 AM & 8:30 PM - 11:30 PM): Peak publishing
      // Using more aggressive caching during high activity to ensure fresh content
      return {
        staleDuration: isArticlePage ? 60 : 30, // 1 min for articles, 30 secs for homepage/categories
        errorDuration: isArticlePage ? 180 : 120, // 3 min for articles, 2 min for homepage/categories
      };

    default:
      // Normal Activity period (all other times): Moderate publishing
      return {
        staleDuration: isArticlePage ? 300 : 180, // 5 min for articles, 3 min for homepage/categories
        errorDuration: isArticlePage ? 600 : 360, // 10 min for articles, 6 min for homepage/categories
      };
  }
}

/**
 * Next.js middleware function to handle cache settings based on content type and activity period
 */
export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next();

  // Get the pathname
  const { pathname } = request.nextUrl;

  // Fix: Skip middleware caching logic for video slug pages
  if (/^\/videos\/.+/.test(pathname)) {
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
        "public, max-age=300, stale-while-revalidate=3600"
      );

      response.headers.set(
        "Cloudflare-CDN-Cache-Control",
        "public, max-age=300, stale-while-revalidate=3600"
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

  // Skip for API routes except for revalidate (which needs custom headers)
  if (pathname.startsWith("/api/") && !pathname.includes("/api/revalidate")) {
    return response;
  }

  // Identify dynamic content pages - expanded to cover all navigation sections
  const isDynamicContent =
    pathname.includes("/category/") ||
    pathname === "/" ||
    pathname.match(
      /^\/(news|berita|business|opinion|world|sports|lifestyle|photos|videos|accelerator)\/?$/
    );

  // For dynamic content, add cache-busting headers
  if (isDynamicContent) {
    // Get the current activity level based on Malaysia time
    const activityLevel = getActivityLevel();

    // Get appropriate cache durations based on path and activity level
    const { staleDuration, errorDuration } = getCacheDurations(
      pathname,
      activityLevel
    );

    // Set cache headers
    response.headers.set(
      "Cache-Control",
      `max-age=0, stale-while-revalidate=${staleDuration}, stale-if-error=${errorDuration}, public`
    );

    response.headers.set(
      "Cloudflare-CDN-Cache-Control",
      `max-age=0, stale-while-revalidate=${staleDuration}, stale-if-error=${errorDuration}, public`
    );

    // Add Vary header to differentiate cached versions
    response.headers.set("Vary", "Accept-Encoding, Cookie, x-fmt-fresh");

    // Add a version header for client-side detection of fresh content
    response.headers.set("x-fmt-version", Date.now().toString());

    // Add debug header in non-production environments
    if (process.env.NODE_ENV !== "production") {
      const malaysiaTime = getMalaysiaTime();
      response.headers.set(
        "X-Cache-Debug",
        `activity=${activityLevel}, stale=${staleDuration}s, error=${errorDuration}s, malaysia_time=${malaysiaTime.toISOString()}`
      );
    }
  } else {
    // For other pages, use default cache settings
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=600"
    );

    response.headers.set(
      "Cloudflare-CDN-Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=600"
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
