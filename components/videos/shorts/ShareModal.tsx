// components/videos/shorts/ShareModal.tsx
import { useState } from "react";
import { FaWhatsapp, FaTimes, FaCopy } from "react-icons/fa";
import { RiTwitterXFill } from "react-icons/ri";
import { toast } from "sonner";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  title: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  videoId,
  title,
}: ShareModalProps) {
  const [isCopying, setIsCopying] = useState(false);

  if (!isOpen) return null;

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/videos/${videoId}`;

  // Analytics tracking
  const trackShare = (platform: string) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "share", {
        event_category: "shorts",
        event_label: platform,
        video_id: videoId,
      });
    }
  };

  // Native Web Share API
  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    try {
      await navigator.share({
        title: title,
        text: title,
        url: url,
      });
      trackShare("native_share");
      onClose();
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Share error:", error);
        handleCopyLink();
      }
    }
  };

  // Copy to clipboard
  const handleCopyLink = async () => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      trackShare("copy_link");
      toast.success("Link copied!", {
        duration: 2000,
      });
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      toast.error("Failed to copy", {
        duration: 2000,
      });
    } finally {
      setIsCopying(false);
    }
  };

  // WhatsApp share
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`${title}\n\n${url}`);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    trackShare("whatsapp");
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  // X (Twitter) share
  const handleXShare = () => {
    const params = new URLSearchParams({
      url: url,
      text: title,
    });
    const xUrl = `https://twitter.com/intent/tweet?${params.toString()}`;
    trackShare("x");
    window.open(xUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal - Bottom Sheet Style */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl z-50"
        style={{
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <FaTimes className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Share Options */}
        <div className="px-6 pb-8 space-y-3">
          {/* Native Share (if supported) */}
          {typeof navigator !== "undefined" &&
            typeof navigator.share === "function" && (
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <span className="text-2xl">📤</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Share via...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    More options
                  </p>
                </div>
              </button>
            )}

          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <FaWhatsapp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 dark:text-white">
                WhatsApp
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Share to contacts
              </p>
            </div>
          </button>

          {/* X (Twitter) */}
          <button
            onClick={handleXShare}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
              <RiTwitterXFill className="w-6 h-6 text-white dark:text-gray-900" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 dark:text-white">X</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Post on X
              </p>
            </div>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            disabled={isCopying}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <FaCopy className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 dark:text-white">
                {isCopying ? "Copying..." : "Copy Link"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Copy to clipboard
              </p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
