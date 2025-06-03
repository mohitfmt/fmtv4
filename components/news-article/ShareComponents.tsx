import { useState, useEffect } from "react";
import { FaShareAlt, FaCopy } from "react-icons/fa";
import {
  FaFacebookF,
  FaWhatsapp,
  FaLinkedinIn,
  FaPinterestP,
  FaRedditAlien,
  FaTelegram,
  FaSnapchat,
  FaThreads,
  FaLine,
} from "react-icons/fa6";

import { RiTwitterXFill } from "react-icons/ri";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareComponentsProps {
  url: string;
  title: string;
  mediaUrl?: string;
  hashs?: string[];
}

// Define a proper type for share platforms
interface SharePlatform {
  name: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  color: string;
  darkColor?: string;
  getShareUrl: (params: {
    url: string;
    title: string;
    hashtags?: string[];
    mediaUrl?: string;
  }) => string;
  isSpecialAction?: boolean;
  requiresCopy?: boolean;
}

// Platform configuration with all sharing details
const sharePlatforms: SharePlatform[] = [
  {
    name: "Copy Link",
    icon: FaCopy,
    color: "#6b7280",
    getShareUrl: () => "", // Special handling for copy
    isSpecialAction: true,
  },
  {
    name: "Facebook",
    icon: FaFacebookF,
    color: "#1877f2",
    getShareUrl: ({ url }) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "X",
    icon: RiTwitterXFill,
    color: "#000000",
    darkColor: "#ffffff", // White on dark mode
    getShareUrl: ({ url, title, hashtags }) => {
      const params = new URLSearchParams();
      params.append("url", url);
      params.append("text", title);
      if (hashtags && hashtags.length > 0) {
        params.append("hashtags", hashtags.join(","));
      }
      return `https://twitter.com/intent/tweet?${params.toString()}`;
    },
  },
  {
    name: "WhatsApp",
    icon: FaWhatsapp,
    color: "#25d366",
    getShareUrl: ({ url, title }) => {
      const text = encodeURIComponent(`${title}\n\n${url}`);
      return `https://wa.me/?text=${text}`;
    },
  },
  {
    name: "LinkedIn",
    icon: FaLinkedinIn,
    color: "#0a66c2",
    getShareUrl: ({ url }) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "Telegram",
    icon: FaTelegram,
    color: "#26a5e4",
    getShareUrl: ({ url, title }) => {
      const params = new URLSearchParams();
      params.append("url", url);
      params.append("text", title);
      return `https://t.me/share/url?${params.toString()}`;
    },
  },
  {
    name: "Pinterest",
    icon: FaPinterestP,
    color: "#bd081c",
    getShareUrl: ({ url, title, mediaUrl }) => {
      const params = new URLSearchParams();
      params.append("url", url);
      if (mediaUrl) params.append("media", mediaUrl);
      params.append("description", title);
      return `https://pinterest.com/pin/create/button/?${params.toString()}`;
    },
  },
  {
    name: "Reddit",
    icon: FaRedditAlien,
    color: "#ff4500",
    getShareUrl: ({ url, title }) => {
      const params = new URLSearchParams();
      params.append("url", url);
      params.append("title", title);
      return `https://reddit.com/submit?${params.toString()}`;
    },
  },
  {
    name: "Snapchat",
    icon: FaSnapchat,
    color: "#fffc00",
    darkColor: "#fffc00", // Keep yellow in dark mode with black background
    getShareUrl: ({ url }) =>
      `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(url)}`,
  },
  {
    name: "Threads",
    icon: FaThreads,
    color: "#000000",
    darkColor: "#ffffff", // White on dark mode
    getShareUrl: ({ url, title }) => {
      const text = encodeURIComponent(`${title} ${url}`);
      return `https://threads.net/intent/post?text=${text}`;
    },
  },
  {
    name: "Line",
    icon: FaLine,
    color: "#00c300",
    getShareUrl: ({ url }) =>
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
  },
];

// Helper function to create hashtags for X/Twitter
const formatHashtags = (hashs: string[]): string[] => {
  return hashs
    .filter(
      (hash): hash is string => typeof hash === "string" && hash.length > 0
    )
    .map((hash) => {
      // Remove special characters and create camelCase hashtags
      const words = hash.replace(/[^\w\s]/gi, "").split(/\s+/);
      return words
        .map((word, index) =>
          index === 0
            ? word.toLowerCase()
            : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join("");
    })
    .filter(Boolean);
};

// Analytics tracking function
const trackShare = (platform: string) => {
  // Simple analytics tracking - replace with your analytics service
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "share", {
      event_category: "engagement",
      event_label: platform,
    });
  }
  console.log(`Article shared via: ${platform}`);
};

const ShareComponents: React.FC<ShareComponentsProps> = ({
  url,
  title,
  mediaUrl,
  hashs = [],
}) => {
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Detect mobile device
    const checkMobile = () => {
      const mobileCheck =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(mobileCheck);
    };
    checkMobile();

    // Refresh ads after component mounts
    if (window.googletag?.cmd) {
      window.googletag.cmd.push(() => {
        window.googletag.pubads().refresh();
      });
    }
  }, []);

  // Handle native Web Share API for mobile
  const handleNativeShare = async () => {
    // Validate and prepare share data
    const shareUrl = url || window.location.href;
    const shareTitle = title || document.title || "Check out this article";

    // Check if we're in a secure context (HTTPS or localhost)
    const isSecureContext = window.isSecureContext;
    if (!isSecureContext) {
      toast.error("Secure connection required", {
        description:
          "Sharing requires HTTPS. Please use the platform buttons below.",
        duration: 4000,
      });
      return;
    }

    // Final check for Web Share API availability
    if (!navigator.share || typeof navigator.share !== "function") {
      toast.error("Sharing not supported", {
        description: "Please use the platform buttons below to share.",
        duration: 3000,
      });
      return;
    }

    try {
      // Create share data with validated values
      const shareData = {
        title: shareTitle,
        text: shareTitle,
        url: shareUrl,
      };

      // Attempt to share
      await navigator.share(shareData);

      // Only track if share was successful (not cancelled)
      trackShare("native_share");

      // Show success feedback
      toast.success("Shared successfully!", {
        duration: 2000,
      });
    } catch (error: any) {
      // Handle different error scenarios
      if (error.name === "AbortError") {
        // User cancelled - this is fine, don't show error
        console.log("User cancelled share");
      } else {
        // Show error with helpful guidance
        console.error("Share error:", error);
        toast.error("Unable to share", {
          description: "Please try the platform buttons below instead.",
          duration: 3000,
        });
      }
    }
  };

  // Handle copying link to clipboard
  const handleCopyLink = async () => {
    try {
      // Copy both title and URL for better context
      const textToCopy = `${title}\n${url}`;
      await navigator.clipboard.writeText(textToCopy);
      trackShare("copy_link");

      // Show toast notification with Sonner
      toast.success("Link copied!", {
        description: "Title and link copied to your clipboard.",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy", {
        description: "Please try selecting and copying the URL manually.",
        duration: 3000,
      });
    }
  };

  // Handle share action
  const handleShare = (platform: SharePlatform) => {
    // Special handling for copy link
    if (platform.name === "Copy Link") {
      handleCopyLink();
      return;
    }

    // Generate share URL with all parameters
    const shareUrl = platform.getShareUrl({
      url,
      title,
      hashtags: platform.name === "X" ? formatHashtags(hashs) : undefined,
      mediaUrl,
    });

    // Track the share
    trackShare(platform.name.toLowerCase());

    // Open in new window/tab
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  // Return loading state for SSR
  if (!isClient) {
    return (
      <Button variant="outline" className="w-full sm:w-auto border-[0.5px]">
        <FaShareAlt className="mr-2 h-4 w-4" /> Share
      </Button>
    );
  }

  // Check for Web Share API support
  const hasWebShareApi =
    isClient &&
    "share" in navigator &&
    typeof navigator.share === "function" &&
    window.isSecureContext;

  // Unified render for all devices - always show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto border-[0.5px]">
          <FaShareAlt className="mr-2 h-4 w-4" /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 p-1 dark:border-stone-600 max-h-[70vh] overflow-y-auto">
        {/* Show native share option if available */}
        {hasWebShareApi && (
          <>
            <DropdownMenuItem
              onClick={handleNativeShare}
              className="flex items-center cursor-pointer hover:bg-accent/50 transition-colors gap-3 py-1 px-2"
            >
              <FaShareAlt
                className="h-4 w-4 flex-shrink-0"
                style={{ color: "#6b7280" }}
              />
              <span className="text-sm font-medium">Share via...</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
          </>
        )}

        {sharePlatforms.map((platform, index) => {
          const Icon = platform.icon;
          const isDark = document.documentElement.classList.contains("dark");
          const iconColor =
            isDark && platform.darkColor ? platform.darkColor : platform.color;

          return (
            <div key={platform.name}>
              {/* Add separator after Copy Link */}
              {index === 1 && !hasWebShareApi && (
                <DropdownMenuSeparator className="my-1" />
              )}
              <DropdownMenuItem
                onClick={() => handleShare(platform)}
                className="flex items-center cursor-pointer hover:bg-accent/50 transition-colors gap-3 py-1 px-2"
              >
                <Icon
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: iconColor }}
                />
                <span className="text-sm font-medium">{platform.name}</span>
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareComponents;
