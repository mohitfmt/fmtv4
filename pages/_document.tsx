import { cn } from "@/lib/utils";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  const bodyClasses = cn("antialiased");
  return (
    <Html lang="en">
      <Head />
      <body className={bodyClasses}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
