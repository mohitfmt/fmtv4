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
  const themeColor = resolvedTheme === "dark" ? "#000000" : "#ffffff";
  return (
    <>
      <Head>
        <meta name="theme-color" content={themeColor} />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content={resolvedTheme === "dark" ? "black-translucent" : "default"}
        />
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
        sizes={[1, 1]}
        additionalClass="absolute top-0 left-0 bg-muted"
        additionalStyle={{ height: 0 }}
      />

      {/* OutOfPage Ad */}
      <AdSlot
        id="div-gpt-ad-1661362765847-0"
        name="OutOfPage"
        sizes={[1, 1]}
        outOfPage={true}
        additionalClass="absolute top-0 left-0 bg-muted"
        additionalStyle={{ height: 0 }}
      />
    </>
  );
};

export default Layout;
