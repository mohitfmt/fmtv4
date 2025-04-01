// components/ContentVersionTracker.tsx
import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

/**
 * ContentVersionTracker component
 *
 * Tracks content version information for client-side detection of content updates
 * Should be included in the Layout component or _app.tsx
 */
export const ContentVersionTracker: React.FC = () => {
  const router = useRouter();

  // Extract content version from response headers when the page loads
  useEffect(() => {
    const checkAndTrackVersion = async () => {
      try {
        // Request the current page to check its headers

        let currentPath = window.location.pathname;
        const currentQuery = window.location.search;

        // If we have query parameters, include them in the HEAD request
        if (currentQuery) {
          currentPath += currentQuery;
        }

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
        }
      } catch (error) {
        console.error("Error tracking content version:", error);
      }
    };

    // Run on initial page load
    if (typeof window !== "undefined") {
      checkAndTrackVersion();
    }

    // Run again on route change completion
    const handleRouteChange = () => {
      checkAndTrackVersion();
    };

    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);

  // Listen for storage events to support content version sync across tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith("content-version-") && event.newValue) {
        const path = event.key.replace("content-version-", "");

        // If this is about the current page and the version is different
        if (path === router.asPath) {
          const currentVersion = document
            .querySelector('meta[name="content-version"]')
            ?.getAttribute("content");

          if (currentVersion !== event.newValue) {
            // Another tab has newer content, trigger a refresh
            router.replace(router.asPath, undefined, {
              scroll: false,
              shallow: false,
            });
          }
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
      }
    };
  }, [router]);

  return (
    <Head>
      {/* This meta tag will be updated by the useEffect hook */}
      <meta name="content-version" content="" />
    </Head>
  );
};

export default ContentVersionTracker;
