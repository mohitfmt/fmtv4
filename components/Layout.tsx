import React, { ReactNode } from "react";
import TopBar from "./top-header/TopBar";
import TopBanner from "./top-header/TopBanner";
import Footer from "../components/footer/Footer";
import Container from "../components/Container";
import Head from "next/head";
import AdSlot from "@/components/common/AdSlot";

interface LayoutProps {
  preview?: boolean;
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Pixel AdSlot (1x1 tracking) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "red",
          height: 0,
        }}
      >
        <AdSlot id="div-gpt-ad-1661362827551-0" name="Pixel" sizes={[1, 1]} />
      </div>

      {/* OutOfPage AdSlot (e.g., interstitials, skins) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "red",
          height: 0,
        }}
      >
        <AdSlot
          id="div-gpt-ad-1661362765847-0"
          name="OutOfPage"
          sizes={[1, 1]} // Technically unused, but required by your prop
          outOfPage={true}
        />
      </div>

      <TopBar />
      <TopBanner />
      <Container>
        <div className="min-h-screen py-2">{children}</div>
      </Container>
      <Footer />
    </>
  );
};

export default Layout;
