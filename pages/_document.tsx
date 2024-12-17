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
      </Head>
      <body className={bodyClasses}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
