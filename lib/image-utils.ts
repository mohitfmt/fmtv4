// lib/image-utils.ts
interface ImageDimensions {
  width: number;
  height: number;
}

interface CloudflareImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "auto" | "webp" | "avif" | "json";
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  gravity?: "auto" | "center" | "north" | "south" | "east" | "west";
  sharpen?: number;
}

// Get Cloudflare optimized URL directly (for non-Next Image uses)
export const getCloudflareImageUrl = (
  url: string,
  options: CloudflareImageOptions = {}
): string => {
  if (!url) return "";

  // Normalize URL to absolute
  let absoluteUrl = url;
  if (!url.startsWith("http")) {
    if (url.includes("/wp-content/")) {
      absoluteUrl = `https://media.freemalaysiatoday.com${url.startsWith("/") ? url : "/" + url}`;
    } else {
      absoluteUrl = `https://www.freemalaysiatoday.com${url.startsWith("/") ? url : "/" + url}`;
    }
  }

  const defaultOptions = {
    quality: 75,
    format: "auto",
    fit: "scale-down",
    ...options,
  };

  const params = Object.entries(defaultOptions)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");

  return `https://www.freemalaysiatoday.com/cdn-cgi/image/${params}/${absoluteUrl}`;
};

// Get Open Graph optimized image
export const getOGImageUrl = (url: string): string => {
  return getCloudflareImageUrl(url, {
    width: 1200,
    height: 630,
    quality: 85,
    fit: "cover",
    gravity: "center",
  });
};

// Get Twitter Card optimized image
export const getTwitterImageUrl = (
  url: string,
  cardType: "summary" | "summary_large_image" = "summary_large_image"
): string => {
  const dimensions =
    cardType === "summary"
      ? { width: 400, height: 400 }
      : { width: 1200, height: 600 };

  return getCloudflareImageUrl(url, {
    ...dimensions,
    quality: 85,
    fit: "cover",
  });
};

export const generateStructuredDataImages = (
  imageUrl: string,
  metadata?: {
    caption?: string;
    title?: string;
    width?: number;
    height?: number;
  }
): any => {
  if (!imageUrl) return null;

  // Main image with all metadata
  const mainImage = {
    "@type": "ImageObject",
    "@id": `${imageUrl}#main-image`,
    url: getCloudflareImageUrl(imageUrl, {
      width: metadata?.width || 1600,
      height: metadata?.height || 1000,
      quality: 85,
    }),
    contentUrl: getCloudflareImageUrl(imageUrl, {
      width: metadata?.width || 1600,
      height: metadata?.height || 1000,
      quality: 85,
    }),
    width: metadata?.width || 1600,
    height: metadata?.height || 1000,
    caption: metadata?.caption || metadata?.title || "Article image",
    representativeOfPage: true,
    creditText: metadata?.title || "Free Malaysia Today",
    license: "https://www.freemalaysiatoday.com/privacy-policy/",
    acquireLicensePage: "https://www.freemalaysiatoday.com/privacy-policy/",
    creator: {
      "@type": "Organization",
      name: "Free Malaysia Today",
      url: "https://www.freemalaysiatoday.com",
    },
    copyrightNotice: `© Free Malaysia Today, ${new Date().getFullYear()}`,
  };

  // Additional aspect ratios for Google Discover
  const additionalAspects = [
    {
      "@type": "ImageObject",
      url: getCloudflareImageUrl(imageUrl, {
        width: 1600,
        height: 900,
        quality: 85,
        fit: "cover",
      }),
      width: 1600,
      height: 900,
    },
    {
      "@type": "ImageObject",
      url: getCloudflareImageUrl(imageUrl, {
        width: 1200,
        height: 900,
        quality: 85,
        fit: "cover",
      }),
      width: 1200,
      height: 900,
    },
    {
      "@type": "ImageObject",
      url: getCloudflareImageUrl(imageUrl, {
        width: 1200,
        height: 1200,
        quality: 85,
        fit: "cover",
      }),
      width: 1200,
      height: 1200,
    },
  ];

  // Return main image with metadata + additional aspects
  return [mainImage, ...additionalAspects];
};
