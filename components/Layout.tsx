import React, { ReactNode } from "react";
import TopBar from "./top-header/TopBar";
import TopBanner from "./top-header/TopBanner";
import Footer from "../components/footer/Footer";
import Container from "../components/Container";
import AdSlot from "@/components/common/AdSlot";

interface LayoutProps {
  preview?: boolean;
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
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
