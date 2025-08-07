// lib/cloudflare-loader.js

/**
 * Cloudflare Image Optimization Loader for Next.js
 * Handles image transformation through Cloudflare's Image Resizing API
 */

// Helper function to detect image format from URL
const getImageFormat = (url) => {
  const extension = url.split(".").pop()?.toLowerCase().split("?")[0];
  if (["jpg", "jpeg"].includes(extension)) return "jpeg";
  if (extension === "png") return "png";
  if (extension === "webp") return "webp";
  if (extension === "gif") return "gif";
  if (extension === "svg") return "svg";
  return "auto";
};

// Helper function to determine quality based on format and priority
const getAdaptiveQuality = (format, quality, width) => {
  // If quality is explicitly set, use it
  if (quality && quality !== 75) return quality;

  // Format-specific quality settings
  if (format === "png") {
    // PNGs need higher quality to avoid artifacts
    return 85;
  }

  if (format === "webp" || format === "auto") {
    // WebP can use lower quality with good results
    if (width && width < 400) return 70; // Thumbnails
    if (width && width < 800) return 75; // Medium images
    return 80; // Large images
  }

  if (format === "jpeg" || format === "jpg") {
    if (width && width < 400) return 70; // Thumbnails
    if (width && width < 800) return 75; // Medium images
    return 80; // Large images
  }

  return quality || 75;
};

// Helper function to determine the best fit parameter
const getOptimalFit = (width, format) => {
  // For SVGs and GIFs, don't resize
  if (format === "svg" || format === "gif") {
    return null;
  }

  // For very large widths, use scale-down to prevent upscaling
  if (width && width > 2048) {
    return "scale-down";
  }

  // For PNGs, use contain to prevent upscaling and maintain aspect ratio
  if (format === "png") {
    return "contain";
  }

  // For standard images, use scale-down for optimal results
  return "scale-down";
};

// Main loader function
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

    // SVG files - return without transformation
    if (url.endsWith(".svg") || url.includes(".svg?")) {
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

  // Don't transform data URLs, local assets, SVGs, or already optimized URLs
  if (
    absoluteUrl.startsWith("data:") ||
    absoluteUrl.startsWith("/_next/") ||
    absoluteUrl.includes("/cdn-cgi/image/") ||
    absoluteUrl.endsWith(".svg") ||
    absoluteUrl.includes(".svg?")
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

  // Detect image format for optimization
  const imageFormat = getImageFormat(absoluteUrl);

  // Get adaptive quality based on format and size
  const adaptiveQuality = getAdaptiveQuality(imageFormat, quality, width);

  // Get optimal fit parameter
  const fitParam = getOptimalFit(width, imageFormat);

  // Build Cloudflare transformation parameters
  const params = [];

  // Width parameter - cap at reasonable maximum to prevent upscaling
  if (width) {
    const maxWidth = Math.min(width, 3840); // Cap at 4K width
    params.push(`width=${maxWidth}`);
  }

  // Quality parameter with adaptive settings
  params.push(`quality=${adaptiveQuality}`);

  // Format auto-negotiation (WebP/AVIF for supported browsers)
  params.push("format=auto");

  // Fit parameter based on image type and size
  if (fitParam) {
    params.push(`fit=${fitParam}`);
  }

  // Additional optimization parameters
  params.push("metadata=none"); // Strip metadata for smaller files

  // Add sharpening for better perceived quality at lower file sizes
  // Only for images that benefit from it
  if (imageFormat !== "png" && imageFormat !== "svg" && width && width < 1200) {
    params.push("sharpen=1");
  }

  // DPR (Device Pixel Ratio) - set to 1 to prevent unnecessary upscaling
  // This helps with the PNG size increase issue
  params.push("dpr=1");

  // Error handling - redirect to original on transformation error
  params.push("onerror=redirect");

  // Background color for transparent images when converted to JPEG
  if (imageFormat === "png") {
    params.push("background=%23ffffff"); // White background for PNGs converted to JPEG
  }

  // For very small thumbnails, use more aggressive optimization
  if (width && width <= 200) {
    // Override quality for tiny images
    const indexOfQuality = params.findIndex((p) => p.startsWith("quality="));
    if (indexOfQuality !== -1) {
      params[indexOfQuality] = "quality=65";
    }
  }

  // Development mode bypass (uncomment if needed)
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('[Cloudflare Loader] Dev mode - bypassing optimization for:', absoluteUrl);
  //   return absoluteUrl;
  // }

  // Construct the final Cloudflare URL
  const cloudflareUrl = `https://www.freemalaysiatoday.com/cdn-cgi/image/${params.join(",")}/${absoluteUrl}`;

  // Log transformation details in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Cloudflare Loader] Transforming:", {
      original: src,
      absolute: absoluteUrl,
      format: imageFormat,
      width: width,
      quality: adaptiveQuality,
      fit: fitParam,
      final: cloudflareUrl,
    });
  }

  return cloudflareUrl;
}
