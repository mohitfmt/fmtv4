import siteConfig from "@/constants/site-config";
import { cn } from "@/lib/utils";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  const bodyClasses = cn("antialiased");
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://media.freemalaysiatoday.com" />
        <link rel="dns-prefetch" href="https://media.freemalaysiatoday.com" />

        {/* For Cloudflare */}
        <link rel="preconnect" href="https://imagedelivery.net" />
        <link rel="dns-prefetch" href="https://imagedelivery.net" />

        <meta property="og:type" content="website" />
        <meta property="og:image" content={siteConfig.iconPath} />
        <meta property="og:title" content={siteConfig.siteName} />
        <meta property="og:description" content={siteConfig.siteDescription} />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={siteConfig.siteName} />
        <meta name="twitter:description" content={siteConfig.siteDescription} />
        <meta name="twitter:image" content={siteConfig.iconPath} />
        <meta name="twitter:site" content="@fmtoday" />

        <meta
          name="google-signin-client_id"
          content={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        />
      </Head>
      <body className={bodyClasses}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
