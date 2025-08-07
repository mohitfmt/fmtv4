// lib/image-utils.ts

/**
 * Image optimization utilities for Cloudflare Image Resizing
 * Includes fallback handling and various optimization presets
 */

// Default fallback image URL
const FALLBACK_IMAGE_URL =
  "https://www.freemalaysiatoday.com/PreviewLinkImage.png";

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
  blur?: number;
  background?: string;
  dpr?: number;
}

// Helper to detect image format from URL
const detectImageFormat = (url: string): string => {
  const extension = url.split(".").pop()?.toLowerCase().split("?")[0] || "";
  if (["jpg", "jpeg"].includes(extension)) return "jpeg";
  if (extension === "png") return "png";
  if (extension === "webp") return "webp";
  if (extension === "gif") return "gif";
  return "auto";
};

// Helper to get adaptive quality based on use case
const getAdaptiveQuality = (
  purpose: "thumbnail" | "article" | "hero" | "social" | "general",
  format: string
): number => {
  // Format-specific base quality
  const baseQuality =
    {
      png: 85,
      jpeg: 75,
      webp: 70,
      auto: 75,
    }[format] || 75;

  // Adjust based on purpose
  switch (purpose) {
    case "thumbnail":
      return Math.max(65, baseQuality - 10); // Lower quality for small images
    case "article":
      return baseQuality; // Standard quality for article content
    case "hero":
      return Math.min(90, baseQuality + 10); // Higher quality for hero images
    case "social":
      return Math.min(85, baseQuality + 5); // Good quality for social sharing
    default:
      return baseQuality;
  }
};

// Get Cloudflare optimized URL directly (for non-Next Image uses)
export const getCloudflareImageUrl = (
  url: string | null | undefined,
  options: CloudflareImageOptions = {}
): string => {
  // Handle null/undefined/empty URLs with fallback
  if (!url) {
    url = FALLBACK_IMAGE_URL;
  }

  // Normalize URL to absolute
  let absoluteUrl = url;
  if (!url.startsWith("http")) {
    if (url.includes("/wp-content/")) {
      absoluteUrl = `https://media.freemalaysiatoday.com${url.startsWith("/") ? url : "/" + url}`;
    } else if (url === FALLBACK_IMAGE_URL || url.includes("PreviewLinkImage")) {
      absoluteUrl = FALLBACK_IMAGE_URL;
    } else {
      absoluteUrl = `https://www.freemalaysiatoday.com${url.startsWith("/") ? url : "/" + url}`;
    }
  }

  // Detect format for optimization
  const format = detectImageFormat(absoluteUrl);

  // Build optimized options
  const defaultOptions: CloudflareImageOptions = {
    quality: options.quality || 75,
    format: "auto", // Let Cloudflare choose WebP/AVIF based on browser
    fit: options.fit || "scale-down",
    dpr: 1, // Prevent upscaling issues
    ...options,
  };

  // Add format-specific optimizations
  if (format === "png" && !options.background) {
    defaultOptions.background = "#ffffff"; // White background for PNG to JPEG conversion
  }

  // Add sharpening for smaller images
  if (options.width && options.width < 1200 && !options.sharpen) {
    defaultOptions.sharpen = 1;
  }

  // Build parameter string
  const params = Object.entries(defaultOptions)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      // Handle special characters in values
      if (key === "background" && typeof value === "string") {
        return `${key}=${encodeURIComponent(value)}`;
      }
      return `${key}=${value}`;
    })
    .join(",");

  return `https://www.freemalaysiatoday.com/cdn-cgi/image/${params}/${absoluteUrl}`;
};

// Get thumbnail image with aggressive optimization
export const getThumbnailImageUrl = (
  url: string | null | undefined,
  size: "small" | "medium" | "large" = "medium"
): string => {
  const dimensions = {
    small: { width: 200, height: 150 },
    medium: { width: 400, height: 300 },
    large: { width: 600, height: 400 },
  }[size];

  const format = url ? detectImageFormat(url) : "auto";

  return getCloudflareImageUrl(url, {
    ...dimensions,
    quality: getAdaptiveQuality("thumbnail", format),
    fit: "cover",
    gravity: "center",
  });
};

// Get article content image
export const getArticleImageUrl = (
  url: string | null | undefined,
  width: number = 800
): string => {
  const format = url ? detectImageFormat(url) : "auto";

  return getCloudflareImageUrl(url, {
    width,
    quality: getAdaptiveQuality("article", format),
    fit: "scale-down",
  });
};

// Get hero/featured image
export const getHeroImageUrl = (
  url: string | null | undefined,
  dimensions?: { width?: number; height?: number }
): string => {
  const format = url ? detectImageFormat(url) : "auto";

  return getCloudflareImageUrl(url, {
    width: dimensions?.width || 1920,
    height: dimensions?.height,
    quality: getAdaptiveQuality("hero", format),
    fit: "cover",
    gravity: "center",
  });
};

// Get Open Graph optimized image
export const getOGImageUrl = (url: string | null | undefined): string => {
  // Use fallback if no URL provided
  if (!url) {
    url = FALLBACK_IMAGE_URL;
  }

  const format = detectImageFormat(url);

  return getCloudflareImageUrl(url, {
    width: 1200,
    height: 630,
    quality: getAdaptiveQuality("social", format),
    fit: "cover",
    gravity: "center",
  });
};

// Get Twitter Card optimized image
export const getTwitterImageUrl = (
  url: string | null | undefined,
  cardType: "summary" | "summary_large_image" = "summary_large_image"
): string => {
  // Use fallback if no URL provided
  if (!url) {
    url = FALLBACK_IMAGE_URL;
  }

  const dimensions =
    cardType === "summary"
      ? { width: 400, height: 400 }
      : { width: 1200, height: 600 };

  const format = detectImageFormat(url);

  return getCloudflareImageUrl(url, {
    ...dimensions,
    quality: getAdaptiveQuality("social", format),
    fit: "cover",
    gravity: "center",
  });
};

// Generate responsive image srcset
export const generateSrcSet = (
  url: string | null | undefined,
  sizes: number[] = [400, 800, 1200, 1600, 2400]
): string => {
  // Use fallback if no URL provided
  if (!url) {
    url = FALLBACK_IMAGE_URL;
  }

  return sizes
    .map((size) => {
      const optimizedUrl = getCloudflareImageUrl(url, {
        width: size,
        quality: size <= 600 ? 70 : 75, // Lower quality for smaller sizes
      });
      return `${optimizedUrl} ${size}w`;
    })
    .join(", ");
};

// Generate picture element sources for art direction
export const generatePictureSources = (
  url: string | null | undefined,
  options?: {
    mobile?: ImageDimensions;
    tablet?: ImageDimensions;
    desktop?: ImageDimensions;
  }
): Array<{
  media: string;
  srcset: string;
  type?: string;
}> => {
  // Use fallback if no URL provided
  if (!url) {
    url = FALLBACK_IMAGE_URL;
  }

  const sources = [];

  // AVIF sources (best compression)
  sources.push({
    type: "image/avif",
    media: "(max-width: 640px)",
    srcset: getCloudflareImageUrl(url, {
      width: options?.mobile?.width || 640,
      height: options?.mobile?.height,
      format: "avif",
      quality: 70,
    }),
  });

  sources.push({
    type: "image/avif",
    media: "(max-width: 1024px)",
    srcset: getCloudflareImageUrl(url, {
      width: options?.tablet?.width || 1024,
      height: options?.tablet?.height,
      format: "avif",
      quality: 75,
    }),
  });

  sources.push({
    type: "image/avif",
    media: "(min-width: 1025px)",
    srcset: getCloudflareImageUrl(url, {
      width: options?.desktop?.width || 1920,
      height: options?.desktop?.height,
      format: "avif",
      quality: 80,
    }),
  });

  // WebP sources (good compression, wider support)
  sources.push({
    type: "image/webp",
    media: "(max-width: 640px)",
    srcset: getCloudflareImageUrl(url, {
      width: options?.mobile?.width || 640,
      height: options?.mobile?.height,
      format: "webp",
      quality: 75,
    }),
  });

  sources.push({
    type: "image/webp",
    media: "(max-width: 1024px)",
    srcset: getCloudflareImageUrl(url, {
      width: options?.tablet?.width || 1024,
      height: options?.tablet?.height,
      format: "webp",
      quality: 80,
    }),
  });

  sources.push({
    type: "image/webp",
    media: "(min-width: 1025px)",
    srcset: getCloudflareImageUrl(url, {
      width: options?.desktop?.width || 1920,
      height: options?.desktop?.height,
      format: "webp",
      quality: 85,
    }),
  });

  return sources;
};

// Generate structured data images for SEO
export const generateStructuredDataImages = (
  imageUrl: string | null | undefined,
  metadata?: {
    caption?: string;
    title?: string;
    width?: number;
    height?: number;
  }
): any => {
  // Use fallback if no URL provided
  if (!imageUrl) {
    imageUrl = FALLBACK_IMAGE_URL;
  }

  const format = detectImageFormat(imageUrl);
  const quality = getAdaptiveQuality("social", format);

  // Main image with all metadata
  const mainImage = {
    "@type": "ImageObject",
    "@id": `${imageUrl}#main-image`,
    url: getCloudflareImageUrl(imageUrl, {
      width: metadata?.width || 1600,
      height: metadata?.height || 1000,
      quality,
    }),
    contentUrl: getCloudflareImageUrl(imageUrl, {
      width: metadata?.width || 1600,
      height: metadata?.height || 1000,
      quality,
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

  // Additional aspect ratios for Google Discover and social platforms
  const additionalAspects = [
    {
      "@type": "ImageObject",
      url: getCloudflareImageUrl(imageUrl, {
        width: 1600,
        height: 900,
        quality,
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
        quality,
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
        quality,
        fit: "cover",
      }),
      width: 1200,
      height: 1200,
    },
    {
      "@type": "ImageObject",
      url: getCloudflareImageUrl(imageUrl, {
        width: 1200,
        height: 630,
        quality,
        fit: "cover",
      }),
      width: 1200,
      height: 630,
    },
  ];

  // Return main image with metadata + additional aspects
  return [mainImage, ...additionalAspects];
};

// Utility to preload critical images
export const preloadImage = (
  url: string | null | undefined,
  options?: CloudflareImageOptions
): void => {
  if (typeof window !== "undefined" && url) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = getCloudflareImageUrl(url, options);

    // Add type hint for better browser optimization
    const format = detectImageFormat(url);
    if (format === "webp") {
      link.type = "image/webp";
    } else if (format === "jpeg" || format === "jpg") {
      link.type = "image/jpeg";
    }

    document.head.appendChild(link);
  }
};

// Check if image URL needs fallback
export const needsFallback = (url: string | null | undefined): boolean => {
  return !url || url === "" || url === null || url === undefined;
};

// Get the fallback image URL
export const getFallbackImageUrl = (): string => {
  return FALLBACK_IMAGE_URL;
};
