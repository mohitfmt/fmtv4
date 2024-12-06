import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { Bitter, Red_Hat_Display } from "next/font/google";
import Layout from "@/components/Layout";
import { MultipurposeProvider } from "@/contexts/MultipurposeProvider";
import { GPTProvider } from "@/contexts/GPTProvider";
import { SessionProvider } from "next-auth/react";

const bitter = Bitter({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bitter",
});

const rhd = Red_Hat_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rhd",
});

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
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
          <GPTProvider
            prefix="FMT"
            networkId="1009103"
            bodyAdSlots={{}}
            dfpTargetingParams={{}}
            asPath="/"
          >
            <div
              className={`${bitter.variable} ${rhd.variable} min-h-screen bg-background text-foreground`}
            >
              <Layout>
                <Component {...pageProps} />
              </Layout>
            </div>
          </GPTProvider>
        </MultipurposeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
