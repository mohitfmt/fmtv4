// middleware.ts - PRODUCTION VERSION (COMPLETE)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cache duration configs
const cacheDurations = {
  static: {
    maxAge: 31536000,
    staleWhileRevalidate: 0,
    staleIfError: 0,
  },
  article: {
    maxAge: 30,
    staleWhileRevalidate: 300,
    staleIfError: 1800,
  },
  collection: {
    maxAge: 20,
    staleWhileRevalidate: 120,
    staleIfError: 600,
  },
  listing: {
    maxAge: 20,
    staleWhileRevalidate: 120,
    staleIfError: 600,
  },
  homepage: {
    maxAge: 15,
    staleWhileRevalidate: 60,
    staleIfError: 300,
  },
};

function getContentType(
  pathname: string
): "static" | "article" | "collection" | "listing" | "homepage" {
  if (pathname === "/") return "homepage";
  if (
    pathname.includes("/category/") &&
    /\/\d{4}\/\d{2}\/\d{2}\//.test(pathname)
  ) {
    return "article";
  }
  if (pathname.includes("/category/")) {
    return "collection";
  }
  if (
    pathname.match(
      /^\/(news|berita|business|opinion|world|sports|lifestyle|photos|videos|accelerator)\/?$/
    )
  ) {
    return "listing";
  }
  return "static";
}

function applyCacheTags(response: NextResponse, pathname: string): string[] {
  const cacheTags = [];
  cacheTags.push(`path:${pathname}`);

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
    const pathParts = pathname.split("/").filter(Boolean);
    const categoryIndex = pathParts.indexOf("category");

    if (categoryIndex !== -1 && pathParts.length > categoryIndex + 1) {
      const category = pathParts[categoryIndex + 1];
      cacheTags.push(`category:${category}`);

      const isArticlePage = /\/\d{4}\/\d{2}\/\d{2}\//.test(pathname);
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

      if (datePatternIndex > 0) {
        for (let i = categoryIndex + 2; i < datePatternIndex; i++) {
          if (i < pathParts.length) {
            cacheTags.push(`subcategory:${pathParts[i]}`);
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
        cacheTags.push(`subcategory:${pathParts[categoryIndex + 2]}`);
        cacheTags.push(
          `category-path:${category}/${pathParts[categoryIndex + 2]}`
        );
      }

      if (isArticlePage) {
        cacheTags.push("type:article");
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

  response.headers.set("Cache-Tag", cacheTags.join(","));
  return cacheTags;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Get the host
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const cleanHost = host.split(":")[0].toLowerCase();

  // ===== VIDEO ADMIN PROTECTION START =====
  if (
    pathname.startsWith("/video-admin") ||
    pathname.startsWith("/api/video-admin")
  ) {
    // Block production domain
    if (cleanHost.includes("www.") || cleanHost === "freemalaysiatoday.com") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Only allow on dev-v4 or localhost
    const isAllowedHost =
      process.env.NODE_ENV === "development"
        ? cleanHost === "localhost" ||
          cleanHost === "dev-v4.freemalaysiatoday.com"
        : cleanHost === "dev-v4.freemalaysiatoday.com";
    if (!isAllowedHost) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Skip auth check for login and auth routes
    const exemptPaths = [
      "/video-admin/login",
      "/api/auth/sync-user", // Keep this for AuthContext sync
      "/api/video-admin/debug", // Keep debug endpoint accessible
    ];
    const isExempt = exemptPaths.some((path) => pathname.startsWith(path));
    // Only check authentication if NOT exempt
    if (!isExempt) {
      // Simple cookie check instead of JWT token
      const hasAdminAuth = request.cookies.has("admin_auth");
      if (!hasAdminAuth) {
        const loginUrl = new URL("/video-admin/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
    // Set security headers for admin pages
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  // ===== VIDEO ADMIN PROTECTION END =====

  // ===== CACHE LOGIC START =====
  response.headers.set("X-Debug-Path", pathname);

  if (/^\/videos\/.+/.test(pathname)) {
    response.headers.set("X-Debug-Skip-Reason", "video-page");
    return response;
  }

  if (pathname.startsWith("/api/") && !pathname.includes("/api/revalidate")) {
    response.headers.set("X-Debug-Skip-Reason", "api-route");
    return response;
  }

  const hasAuthCookie = request.cookies.has("auth_token");
  response.headers.set(
    "X-Debug-Auth",
    hasAuthCookie ? "logged-in" : "anonymous"
  );

  if (/\.(jpg|jpeg|png|gif|webp|svg|ico|js|css)$/.test(pathname)) {
    const isArticleImage =
      pathname.includes("/wp-content/uploads/") &&
      request.headers.get("referer")?.includes("/category/");

    if (isArticleImage) {
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

  const contentType = getContentType(pathname);
  const { maxAge, staleWhileRevalidate, staleIfError } =
    cacheDurations[contentType];

  response.headers.set("X-Debug-Content-Type", contentType);
  response.headers.set("X-Debug-Cache-MaxAge", maxAge.toString());
  response.headers.set("X-Debug-Cache-SWR", staleWhileRevalidate.toString());
  response.headers.set("X-Debug-Cache-SIE", staleIfError.toString());

  if (hasAuthCookie) {
    response.headers.set("Cache-Control", "private, no-cache");
    response.headers.set("Cloudflare-CDN-Cache-Control", "private, no-cache");
    response.headers.set("X-Debug-Cache-Policy", "private-no-cache");
  } else {
    const cacheControlValue = `public, max-age=${maxAge}${
      staleWhileRevalidate
        ? `, stale-while-revalidate=${staleWhileRevalidate}`
        : ""
    }${staleIfError ? `, stale-if-error=${staleIfError}` : ""}`;

    response.headers.set("Cache-Control", cacheControlValue);
    response.headers.set("Cloudflare-CDN-Cache-Control", cacheControlValue);
    response.headers.set("X-Debug-Cache-Policy", "tiered-public");

    const cacheTags = applyCacheTags(response, pathname);
    response.headers.set("X-Debug-Cache-Tags", cacheTags.join(","));
    response.headers.set(
      "X-Debug-Cache-Tag-Count",
      cacheTags.length.toString()
    );
  }

  const versionTimestamp = Math.floor(Date.now() / 10000) * 10000;
  response.headers.set("x-fmt-version", versionTimestamp.toString());
  response.headers.set(
    "X-Debug-Version-Timestamp",
    versionTimestamp.toString()
  );
  response.headers.set("Vary", "Accept-Encoding, Cookie, User-Agent");
  response.headers.set("X-Middleware-Version", "1.1.0");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/(?!revalidate|video-admin)).*)",
    "/video-admin/:path*",
    "/api/video-admin/:path*",
  ],
};
