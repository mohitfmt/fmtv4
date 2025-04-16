import { useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function ContentVersionTracker() {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(0);
  const refreshCountRef = useRef<number>(0);
  const blockingRef = useRef<boolean>(false);
  const checkingRef = useRef<boolean>(false);

  // Extract content version from response headers and handle updates
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkAndTrackVersion = async () => {
      // Prevent concurrent checks
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        const currentPath = window.location.pathname;

        // Make HEAD request to check headers
        const response = await fetch(currentPath, {
          method: "HEAD",
          cache: "no-cache",
        });

        // Get the content version from headers
        const contentVersion = response.headers.get("x-fmt-version");

        if (contentVersion) {
          // Store the version in a meta tag for later comparison
          const existingMeta = document.querySelector(
            'meta[name="content-version"]'
          );

          if (existingMeta) {
            // Update existing meta tag
            existingMeta.setAttribute("content", contentVersion);
          } else {
            // Create new meta tag if it doesn't exist
            const meta = document.createElement("meta");
            meta.name = "content-version";
            meta.content = contentVersion;
            document.head.appendChild(meta);
          }

          // Also store in localStorage for cross-tab synchronization
          localStorage.setItem(
            `content-version-${router.asPath}`,
            contentVersion
          );

          // Check if we need to refresh due to version change
          const storedVersion = sessionStorage.getItem("fmt-content-version");

          if (storedVersion && storedVersion !== contentVersion) {
            console.log("Content updated, refreshing page...");
            sessionStorage.setItem("fmt-content-version", contentVersion);

            // Only refresh if we're not in a rapid refresh cycle
            if (!blockingRef.current && refreshCountRef.current < 2) {
              // Use soft refresh to avoid triggering rapid refresh protection
              window.location.reload();
            }
          } else if (!storedVersion) {
            sessionStorage.setItem("fmt-content-version", contentVersion);
          }
        }
      } catch (error) {
        console.warn("Error tracking content version:", error);
      } finally {
        checkingRef.current = false;
      }
    };

    // Run on initial page load
    checkAndTrackVersion();

    // Set up interval to check periodically (every 30 seconds)
    const interval = setInterval(checkAndTrackVersion, 30000);

    // Run again on route change completion
    const handleRouteChange = () => {
      checkAndTrackVersion();
    };

    router.events.on("routeChangeComplete", handleRouteChange);

    // Rapid refresh protection
    const now = Date.now();

    if (now - lastRefreshRef.current < 1000) {
      refreshCountRef.current += 1;

      // If we detect 3+ rapid refreshes, block for a few seconds
      if (refreshCountRef.current >= 3 && !blockingRef.current) {
        blockingRef.current = true;

        // Create overlay to prevent interaction
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.backgroundColor = "rgba(255,255,255,0.9)";
        overlay.style.zIndex = "9999";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.flexDirection = "column";
        overlay.innerHTML = `
          <div style="text-align:center; padding: 20px;">
            <h2 style="margin-bottom:10px;">Loading...</h2>
            <p>Please wait while we prepare your content.</p>
          </div>
        `;

        document.body.appendChild(overlay);

        // Remove after cooling period
        setTimeout(() => {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
          }
          blockingRef.current = false;
          refreshCountRef.current = 0;
        }, 2000);
      }
    } else {
      // Reset counter if not a rapid refresh
      refreshCountRef.current = Math.max(0, refreshCountRef.current - 1);
    }

    lastRefreshRef.current = now;

    // Listen for storage events to support content version sync across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith("content-version-") && event.newValue) {
        const path = event.key.replace("content-version-", "");

        // If this is about the current page and the version is different
        if (path === router.asPath) {
          const currentVersion = document
            .querySelector('meta[name="content-version"]')
            ?.getAttribute("content");

          if (currentVersion !== event.newValue && !blockingRef.current) {
            // Another tab has newer content, trigger a refresh
            router.replace(router.asPath, undefined, {
              scroll: false,
              shallow: false,
            });
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      router.events.off("routeChangeComplete", handleRouteChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [router.asPath]);

  return (
    <Head>
      {/* This meta tag will be updated by the useEffect hook */}
      <meta name="content-version" content="" />
    </Head>
  );
}
