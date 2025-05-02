import React, { ReactNode } from "react";
import TopBar from "./top-header/TopBar";
import TopBanner from "./top-header/TopBanner";
import Footer from "../components/footer/Footer";
import Container from "../components/Container";
import AdSlot from "@/components/common/AdSlot";
import Head from "next/head";
import { useTheme } from "next-themes";

interface LayoutProps {
  preview?: boolean;
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { resolvedTheme } = useTheme();
  const themeColor = resolvedTheme === "dark" ? "#211c1a" : "#ffffff";

  const dfpTargetingParams = {
    pos: "listing",
    section: ["global"],
    key: [
      "Free Malaysia Today",
      "Malaysia News",
      "Latest Malaysia News",
      "Breaking News Malaysia",
      "Malaysia Politics News",
      "gambling",
      "religion",
      "alcohol",
      "lgbt",
      "sex",
      "drug abuse",
      "get rich",
      "match-making",
      "dating",
      "lottery",
    ],
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

      {/* Pixel Ad */}
      <AdSlot
        id="div-gpt-ad-1661362827551-0"
        name="Pixel"
        targetingParams={dfpTargetingParams}
        sizes={[1, 1]}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />

      {/* OutOfPage Ad */}
      <AdSlot
        id="div-gpt-ad-1661362765847-0"
        name="OutOfPage"
        sizes={[1, 1]}
        outOfPage={true}
        targetingParams={dfpTargetingParams}
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
