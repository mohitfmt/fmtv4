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
        {/* ============================================== */}
        {/* Antsomi CDP Web Insight Script                */}
        {/* ⚠️ CHANGE _propId BEFORE PRODUCTION DEPLOY ⚠️ */}
        {/* Staging: 565041059                            */}
        {/* Production: 565041291                         */}
        {/* ============================================== */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              var _portalId = "564892845";
              var _propId = "565041291"; // ⚠️ STAGING - Change to 565041291 for PRODUCTION
              var _AP_REGION = 'ap2';
              var _ATM_TRACKING_ASSOCIATE_UTM = 0;
              var _CDP_GA_ACCOUNT_TRACKING_ID = "G-1BXSGEDPNV";
              var _cdpEnableDomainBridge = true;
              var _cdp365Analytics = {
                default_event: 0,
                first_party_domain: ".freemalaysiatoday.com",
                dims: {
                  users: {
                    origin_source: "freemalaysiatoday.com"
                  }
                }
              };
              (function() {
                var w = window;
                if (w.web_event) return;
                var a = window.web_event = function() {
                  a.queue.push(arguments);
                };
                a.propId = _propId;
                a.track = a;
                a.queue = [];
                var e = document.createElement("script");
                e.type = "text/javascript";
                e.async = true;
                e.src = "//st-a.cdp.asia/insight.js";
                var t = document.getElementsByTagName("script")[0];
                t.parentNode.insertBefore(e, t);
              })();
            `,
          }}
        />
      </Head>
      <body className={bodyClasses}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
