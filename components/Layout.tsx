// components/Layout.tsx
import React, { ReactNode } from "react";
import { useRouter } from "next/router";
import TopBar from "./top-header/TopBar";
import TopBanner from "./top-header/TopBanner";
import Footer from "../components/footer/Footer";
import Container from "../components/Container";
import Head from "next/head";
import { useTheme } from "next-themes";
import AdSlot from "./common/AdSlot";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const themeColor = resolvedTheme === "dark" ? "#211c1a" : "#ffffff";

  // Derive section from current path for targeting
  const getSection = (): string[] => {
    const path = router.asPath;

    // Extract primary section from path
    if (path === "/") return ["homepage"];

    const segments = path.split("/").filter(Boolean);
    const firstSegment = segments[0];

    // Map paths to sections
    const sectionMap: Record<string, string> = {
      news: "news",
      berita: "berita",
      business: "business",
      lifestyle: "lifestyle",
      opinion: "opinion",
      world: "world",
      sports: "sports",
      videos: "videos",
      photos: "photos",
      category: segments[1] || "category", // /category/nation -> nation
    };

    return [sectionMap[firstSegment] || firstSegment, "outofpage"];
  };

  // OutOfPage targeting params derived from route
  const outOfPageTargetingParams = {
    pos: "outofpage",
    section: getSection(),
    site: "fmt",
  };

  return (
    <>
      <Head>
        <meta name="theme-color" content={themeColor} />
      </Head>
      <TopBar />
      <TopBanner />
      <Container>
        <div className="min-h-screen py-2">{children}</div>
      </Container>
      <Footer />

      {/* 
        Persistent OutOfPage Ad - Single instance for entire site
        Lives outside Container so it can render fixed/floating overlays
        Never unmounts during client-side navigation
      */}
      <AdSlot
        id="div-gpt-ad-1661362765847-0"
        name="OutOfPage"
        sizes={[1, 1]}
        outOfPage={true}
        targetingParams={outOfPageTargetingParams}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />
    </>
  );
};

export default Layout;
