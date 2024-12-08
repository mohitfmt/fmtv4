import React, { ReactNode } from "react";
import TopBar from "./top-header/TopBar";
import TopBanner from "./top-header/TopBanner";
import Footer from "../components/footer/Footer";
import Container from "../components/Container";

interface LayoutProps {
  preview?: boolean;
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ preview, children }) => {
  return (
    <>
      <TopBar />
      <Container>
        <TopBanner />
        <div className="min-h-screen py-2">{children}</div>
      </Container>
      <Footer />
    </>
  );
};

export default Layout;
