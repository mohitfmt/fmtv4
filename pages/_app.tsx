import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { Bitter, Red_Hat_Display, Roboto_Slab } from "next/font/google";
import Layout from "@/components/Layout";
import { MultipurposeProvider } from "@/contexts/MultipurposeProvider";
import { GPTProvider } from "@/contexts/GPTProvider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/contexts/AuthContext";

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

const roboto = Roboto_Slab({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-roboto",
});

export default function App({
  Component,
  pageProps: { ...pageProps },
}: AppProps) {
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
            <GPTProvider
              prefix="FMT"
              networkId="1009103"
              bodyAdSlots={{}}
              dfpTargetingParams={{}}
              asPath="/"
            >
              <div
                className={`${bitter.variable} ${rhd.variable} ${roboto.variable} min-h-screen bg-background text-foreground`}
              >
                <Layout>
                  <Component {...pageProps} />
                </Layout>
              </div>
            </GPTProvider>
          </MultipurposeProvider>
        </ThemeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
