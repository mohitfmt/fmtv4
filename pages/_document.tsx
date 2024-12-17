import { cn } from "@/lib/utils";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  const bodyClasses = cn("antialiased");
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://media.freemalaysiatoday.com" />
      </Head>
      <body className={bodyClasses}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
