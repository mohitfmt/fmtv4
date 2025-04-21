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

        {/* Favicons */}
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
          rel="icon"
          type="image/png"
          sizes="256x256"
          href="/favicon-256x256.png"
        />
        <link rel="shortcut icon" href="/favicon.ico" />

        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <meta property="fb:app_id" content="193538481218906" />

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
