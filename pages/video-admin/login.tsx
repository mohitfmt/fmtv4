import { GetServerSideProps } from "next";
import { useSession, signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useRouter } from "next/router";
import { LogoSVG } from "@/components/ui/icons/LogoSVG";
import { useTheme } from "next-themes";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export default function VideoAdminLogin() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const [oneTapLoaded, setOneTapLoaded] = useState(false);
  const [autoSelect, setAutoSelect] = useState(false);
  const oneTapRef = useRef<HTMLDivElement>(null);

  // Check for session and redirect if logged in
  useEffect(() => {
    if (session?.user?.email?.endsWith("@freemalaysiatoday.com")) {
      router.replace("/video-admin");
    }
  }, [session, router]);

  // Check for errors in URL
  useEffect(() => {
    if (router.query.error === "domain") {
      router.replace("/video-admin/login", undefined, { shallow: true });
    }
  }, [router]);

  // Check if user just signed out
  useEffect(() => {
    const signedOut = sessionStorage.getItem("admin_signed_out");
    if (signedOut === "true") {
      setAutoSelect(true);
      sessionStorage.removeItem("admin_signed_out");
    }
  }, []);

  // Initialize Google One Tap
  useEffect(() => {
    if (oneTapLoaded && !session && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: handleOneTapResponse,
          auto_select: autoSelect,
          cancel_on_tap_outside: false,
          context: "signin",
          ux_mode: "popup",
          itp_support: true,
        });

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.log(
              "One Tap not displayed:",
              notification.getNotDisplayedReason()
            );
          }
        });

        if (oneTapRef.current) {
          window.google.accounts.id.renderButton(oneTapRef.current, {
            type: "standard",
            theme: theme === "dark" ? "filled_black" : "filled_blue",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: 280,
          });
        }
      } catch (error) {
        console.error("One Tap init error:", error);
      }
    }
  }, [oneTapLoaded, session, autoSelect, theme]);

  const handleOneTapResponse = async (response: any) => {
    try {
      await signIn("google-onetap", {
        idToken: response.credential,
        callbackUrl: "/video-admin",
        redirect: true,
      });
    } catch (error) {
      console.error("One Tap sign-in error:", error);
    }
  };

  const handleSignIn = () => {
    signIn("google", { callbackUrl: "/video-admin" });
  };

  const handleSignInDifferent = () => {
    // Force Google account chooser
    signIn("google", {
      callbackUrl: "/video-admin",
      prompt: "select_account",
    });
  };

  return (
    <>
      <Head>
        <title>Admin Login - Free Malaysia Today</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setOneTapLoaded(true)}
      />

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <LogoSVG className="h-20 mx-auto" />
            <h1 className="text-3xl font-bold text-foreground mt-4">
              Video Admin Portal
            </h1>
            <p className="text-muted-foreground mt-2">Staff access only</p>
          </div>

          <div className="bg-card rounded-lg shadow-lg border border-border p-8">
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-foreground">
                Sign In Required
              </h2>
            </div>

            <div className="space-y-4">
              {/* Google One Tap button container */}
              <div ref={oneTapRef} className="flex justify-center" />

              {/* Fallback sign-in button */}
              {!oneTapLoaded && (
                <Button
                  onClick={handleSignIn}
                  className="w-full bg-[#4285f4] hover:bg-[#357ae8] text-white"
                  size="lg"
                >
                  Sign in with Google
                </Button>
              )}

              {/* Sign in with different account */}
              <Button
                onClick={handleSignInDifferent}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Sign in with different account
              </Button>
            </div>

            <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Only @freemalaysiatoday.com emails are
                authorized.
              </p>
            </div>

            {router.query.error === "domain" && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Access denied: Email domain not authorized
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  // If already logged in with correct domain, redirect to dashboard
  if (session?.user?.email?.endsWith("@freemalaysiatoday.com")) {
    return {
      redirect: {
        destination: "/video-admin",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
