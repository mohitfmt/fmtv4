// lib/cloudflare-loader.js
export default function cloudflareLoader({ src, width, quality }) {
  // Handle different URL patterns
  const normalizeUrl = (url) => {
    // Already a full Cloudflare URL - return as is
    if (url.includes("/cdn-cgi/image/")) {
      return url;
    }

    // Data URLs or local Next.js assets - don't transform
    if (url.startsWith("data:") || url.startsWith("/_next/")) {
      return url;
    }

    // External URLs that aren't FMT domains
    if (
      url.startsWith("http") &&
      !url.includes("freemalaysiatoday.com") &&
      !url.includes("s3media.freemalaysiatoday.com")
    ) {
      return url;
    }

    // Handle absolute URLs
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    // Handle protocol-relative URLs
    if (url.startsWith("//")) {
      return `https:${url}`;
    }

    // Handle media/wp-content URLs
    if (url.includes("/wp-content/")) {
      const baseUrl = url.startsWith("/")
        ? `https://media.freemalaysiatoday.com${url}`
        : `https://media.freemalaysiatoday.com/${url}`;
      return baseUrl;
    }

    // Local assets in public folder
    if (url.startsWith("/")) {
      return `https://www.freemalaysiatoday.com${url}`;
    }

    // Default case
    return url;
  };

  const absoluteUrl = normalizeUrl(src);

  // Don't transform data URLs, local assets, or already optimized URLs
  if (
    absoluteUrl.startsWith("data:") ||
    absoluteUrl.startsWith("/_next/") ||
    absoluteUrl.includes("/cdn-cgi/image/")
  ) {
    return absoluteUrl;
  }

  // Skip Cloudflare for non-FMT external URLs
  if (
    absoluteUrl.startsWith("http") &&
    !absoluteUrl.includes("freemalaysiatoday.com") &&
    !absoluteUrl.includes("s3media.freemalaysiatoday.com")
  ) {
    return absoluteUrl;
  }

  // Build Cloudflare transformation URL
  const params = [
    `width=${width}`,
    `quality=${quality || 75}`,
    "format=auto",
    "fit=scale-down",
    "metadata=none",
    "onerror=redirect",
  ];

  // For development, you might want to bypass Cloudflare
  // if (process.env.NODE_ENV === 'development') {
  //   return absoluteUrl;
  // }

  return `https://www.freemalaysiatoday.com/cdn-cgi/image/${params.join(",")}/${absoluteUrl}`;
}
