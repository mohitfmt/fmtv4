import React, { ReactNode } from "react";
import TopBar from "./top-header/TopBar";
import TopBanner from "./top-header/TopBanner";
import Footer from "../components/footer/Footer";
import Container from "../components/Container";
import Head from "next/head";
import { useTheme } from "next-themes";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { resolvedTheme } = useTheme();
  const themeColor = resolvedTheme === "dark" ? "#211c1a" : "#ffffff";

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
    </>
  );
};

export default Layout;
