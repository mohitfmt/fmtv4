import React, { ReactNode } from "react";
import TopBar from "./top-header/TopBar";
import TopBanner from "./top-header/TopBanner";
import Footer from "../components/footer/Footer";
import Container from "../components/Container";
import Head from "next/head";

interface LayoutProps {
  preview?: boolean;
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ preview, children }) => {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
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
