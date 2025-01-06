import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { Bitter, Red_Hat_Display, Roboto_Slab } from "next/font/google";
import Layout from "@/components/Layout";
import { MultipurposeProvider } from "@/contexts/MultipurposeProvider";
// import { GPTProvider } from "@/contexts/GPTProvider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/contexts/AuthContext";
import NextTopLoader from "nextjs-toploader";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const GPTProvider = dynamic(
  () => import("@/contexts/GPTProvider").then((mod) => mod.GPTProvider),
  {
    ssr: false,
    loading: () => <div>Loading Ads...</div>,
  }
);

const bitter = Bitter({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bitter",
  preload: true,
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const rhd = Red_Hat_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rhd",
  preload: true,
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const roboto = Roboto_Slab({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-roboto",
  preload: true,
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export default function App({
  Component,
  pageProps: { ...pageProps },
}: AppProps) {
  const [isAdProviderLoaded, setIsAdProviderLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAdProviderLoaded(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const content = (
    <div
      className={`${bitter.variable} ${rhd.variable} ${roboto.variable} min-h-screen bg-background text-foreground`}
    >
      <NextTopLoader
        color="#FFD700"
        initialPosition={0.08}
        crawlSpeed={500}
        height={3}
        crawl={true}
        showSpinner={false}
        easing="easeInOutCubic"
        speed={500}
      />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </div>
  );

  return (
    <GoogleOAuthProvider
      clientId={`${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}`}
    >
      <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          value={{
            light: "light",
            dark: "dark",
            system: "system",
          }}
        >
          <MultipurposeProvider>
            {isAdProviderLoaded ? (
              <GPTProvider
                prefix="FMT"
                networkId="1009103"
                bodyAdSlots={{}}
                dfpTargetingParams={{}}
                asPath="/"
              >
                {content}
              </GPTProvider>
            ) : (
              content
            )}
          </MultipurposeProvider>
        </ThemeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
