import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { Bitter, Red_Hat_Display } from "next/font/google";

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

export default function App({ Component, pageProps }: AppProps) {
  return (
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
      <div
        className={`${bitter.variable} ${rhd.variable} min-h-screen bg-background text-foreground`}
      >
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}
