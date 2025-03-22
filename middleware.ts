// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper function to determine if current time is peak hours
function isPeakHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  // Check if it's weekend (0 = Sunday, 6 = Saturday)
  const isWeekend = day === 0 || day === 6;

  // Check if outside operational hours (12:30 AM - 6:30 AM)
  const isOffHours =
    hour < 6 ||
    (hour === 6 && now.getMinutes() < 30) ||
    (hour === 0 && now.getMinutes() >= 30);

  // If weekend or off-hours, not peak
  if (isWeekend || isOffHours) return false;

  // Define peak hours (9 AM - 9 PM on weekdays)
  return hour >= 9 && hour < 21;
}

export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next();

  // Get the pathname
  const { pathname } = request.nextUrl;

  // For static assets, we'll implement a smarter caching strategy
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico|js|css)$/.test(pathname)) {
    // Parse the URL to check if it's an image in a post context
    const isArticleImage =
      pathname.includes("/wp-content/uploads/") &&
      request.headers.get("referer")?.includes("/category/");

    if (isArticleImage) {
      // For images that might be updated, use shorter cache with revalidation
      // This allows your revalidation system to update images without waiting for cache expiry
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

  // Skip for API routes
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // Determine cache duration based on peak hours
  let staleDuration: number;
  let errorDuration: number;

  // Check if it's a specific article page that might be frequently updated
  const isArticlePage = pathname.includes("/category/");

  if (isPeakHours()) {
    // Peak hours (9AM-9PM weekdays)
    if (isArticlePage) {
      // Article pages during peak hours: very short cache (1 minute)
      // This matches your publishing frequency of ~2 posts per 5 mins
      staleDuration = 60;
      errorDuration = 120;
    } else {
      // Home and category pages during peak: short cache (2 minutes)
      staleDuration = 120;
      errorDuration = 300;
    }
  } else if (pathname === "/" || pathname.includes("/category/")) {
    // Home and category pages during off-peak: medium cache
    staleDuration = 180;
    errorDuration = 300;
  } else {
    // Article pages during off-peak: longer cache
    staleDuration = 300;
    errorDuration = 600;
  }

  // Check if it's during non-operational hours (12:30 AM - 6:30 AM)
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (
    (hour === 0 && minute >= 30) ||
    (hour > 0 && hour < 6) ||
    (hour === 6 && minute < 30)
  ) {
    // Overnight: much longer cache (30 minutes)
    staleDuration = 1800;
    errorDuration = 3600;
  }

  // Set cache headers
  response.headers.set(
    "Cache-Control",
    `max-age=0, stale-while-revalidate=${staleDuration}, stale-if-error=${errorDuration}, public`
  );

  response.headers.set(
    "Cloudflare-CDN-Cache-Control",
    `max-age=0, stale-while-revalidate=${staleDuration}, stale-if-error=${errorDuration}, public`
  );

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
