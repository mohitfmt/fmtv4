import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { Bitter, Red_Hat_Display, Roboto_Slab } from "next/font/google";
import Layout from "@/components/Layout";
import { MultipurposeProvider } from "@/contexts/MultipurposeProvider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/contexts/AuthContext";
import NextTopLoader from "nextjs-toploader";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import Head from "next/head";
// import siteConfig from "@/constants/site-config";
import Script from "next/script";
import { useRouter } from "next/router";
import { SessionProvider } from "next-auth/react";

const preloadGPTScript = () => {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "script";
  link.href = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
  document.head.appendChild(link);
};

const GPTProvider =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () => import("@/contexts/GPTProvider").then((mod) => mod.GPTProvider),
        {
          ssr: false,
          loading: () => null,
        }
      )
    : dynamic(() =>
        import("@/contexts/GPTProvider").then((mod) => mod.GPTProvider)
      );

const bitter = Bitter({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bitter",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const rhd = Red_Hat_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rhd",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const roboto = Roboto_Slab({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-roboto",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const isAdInitialized = useRef(false);
  const router = useRouter();
  const isAdminRoute = router.pathname.startsWith("/video-admin");

  useEffect(() => {
    if (!isAdInitialized.current) {
      // Preload GPT script early but initialize later.
      preloadGPTScript();
      isAdInitialized.current = true;
    }
  }, []);

  const content = (
    <div className={`${bitter.variable} ${rhd.variable} ${roboto.variable}`}>
      <div className="min-h-screen bg-background text-foreground">
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
    </div>
  );

  const finalContent = isAdminRoute ? (
    <SessionProvider session={session}>
      <div className={`${bitter.variable} ${rhd.variable} ${roboto.variable}`}>
        <div className="min-h-screen bg-background text-foreground">
          <Component {...pageProps} />
        </div>
      </div>
    </SessionProvider>
  ) : (
    content
  );
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />

        {/* Viewport for responsiveness */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=4, viewport-fit=cover"
        />

        {/* Referrer Policy */}
        <meta name="referrer" content="no-referrer-when-downgrade" />

        {/* Robots Meta Tags - Enhanced */}
        <meta
          name="robots"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />

        {/* Googlebot Directives */}
        <meta
          name="googlebot"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="googlebot-news"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />

        {/* Bingbot Directives - NEW */}
        <meta
          name="bingbot"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />

        {/* Other Search Engine Bots */}
        <meta
          name="slurp"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="msnbot"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="yandexbot"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="baiduspider"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />

        {/* Application Information */}
        <meta name="application-name" content="Free Malaysia Today" />
        <meta name="apple-mobile-web-app-title" content="FMT News" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Theme Color */}
        <meta
          name="theme-color"
          content="#ffffff"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#000000"
          media="(prefers-color-scheme: dark)"
        />

        {/* DNS Prefetch and Preconnect for Performance */}
        <link rel="dns-prefetch" href="https://media.freemalaysiatoday.com" />
        <link
          rel="dns-prefetch"
          href="https://securepubads.g.doubleclick.net"
        />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://scripts.kiosked.com" />

        <link
          rel="preconnect"
          href="https://media.freemalaysiatoday.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://securepubads.g.doubleclick.net"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Favicon and Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/manifest.json" />

        {/* RSS Feeds - Global */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Free Malaysia Today - RSS Feed"
          href="https://www.freemalaysiatoday.com/feeds/rss/headlines"
        />
        <link
          rel="alternate"
          type="application/atom+xml"
          title="Free Malaysia Today - Atom Feed"
          href="https://www.freemalaysiatoday.com/feeds/atom/headlines"
        />
        <link
          rel="alternate"
          type="application/feed+json"
          title="Free Malaysia Today - JSON Feed"
          href="https://www.freemalaysiatoday.com/feeds/json/headlines"
        />
      </Head>

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
                {finalContent}
              </GPTProvider>
            </MultipurposeProvider>
          </ThemeProvider>
        </AuthProvider>
      </GoogleOAuthProvider>

      {/* Add Kiosked script here */}
      <Script
        src="https://scripts.kiosked.com/loader/kiosked-loader.js"
        strategy="lazyOnload"
        async
        defer
      />
      {/* Meta Pixel script using Next.js Script component */}
      <Script
        id="meta-pixel-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '1700117030393255');
      fbq('track', 'PageView');
    `,
        }}
        // defer
        async
      />

      {/* NoScript fallback as a proper React component */}
      <noscript>
        {/* eslint-disable-next-line */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=1700117030393255&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>
    </>
  );
}
