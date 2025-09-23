// pages/video-admin/login.tsx - FIXED VERSION
import { GetServerSideProps } from "next";
import { useSession, signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/router";
import { LogoSVG } from "@/components/ui/icons/LogoSVG";
import { useTheme } from "next-themes";

export default function VideoAdminLogin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const [oneTapLoaded, setOneTapLoaded] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const oneTapRef = useRef<HTMLDivElement>(null);
  const [justSignedOut, setJustSignedOut] = useState(false);

  // Check if user just signed out
  useEffect(() => {
    if (sessionStorage.getItem("admin_signed_out") === "true") {
      setJustSignedOut(true);
      sessionStorage.removeItem("admin_signed_out");
      // Disable One Tap auto-select after logout
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
    }
  }, []);

  // Check for session and redirect - SIMPLIFIED
  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.email?.endsWith("@freemalaysiatoday.com")
    ) {
      const callbackUrl =
        (router.query.callbackUrl as string) || "/video-admin";
      // Use window.location for more reliable redirect
      window.location.href = callbackUrl;
    }
  }, [session, status, router.query.callbackUrl]);

  // Check for errors
  useEffect(() => {
    const error = router.query.error as string;
    if (error === "domain") {
      setError("Please use your @freemalaysiatoday.com email address");
    } else if (error === "unauthorized") {
      setError("You are not authorized to access this portal");
    }
  }, [router.query]);

  // Initialize Google One Tap - SIMPLIFIED
  useEffect(() => {
    if (
      oneTapLoaded &&
      status === "unauthenticated" &&
      !justSignedOut &&
      window.google
    ) {
      try {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: handleOneTapResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
          context: "signin",
          ux_mode: "popup",
        });

        // Only prompt if not just signed out
        if (!justSignedOut) {
          window.google.accounts.id.prompt();
        }

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
  }, [oneTapLoaded, status, justSignedOut, theme]);

  const handleOneTapResponse = async (response: any) => {
    setIsSigningIn(true);
    setError(null);
    try {
      const result = await signIn("google-onetap", {
        idToken: response.credential,
        callbackUrl: (router.query.callbackUrl as string) || "/video-admin",
        redirect: false, // Handle redirect manually
      });

      if (result?.ok) {
        // Manual redirect for reliability
        const callbackUrl =
          (router.query.callbackUrl as string) || "/video-admin";
        window.location.href = callbackUrl;
      } else {
        setError("Sign in failed. Please try again.");
        setIsSigningIn(false);
      }
    } catch (error) {
      setError("Sign in failed. Please try again.");
      setIsSigningIn(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);

    try {
      const result = await signIn("google", {
        callbackUrl: (router.query.callbackUrl as string) || "/video-admin",
        prompt: justSignedOut ? "select_account" : undefined,
        redirect: false, // Handle redirect manually
      });

      if (result?.ok) {
        // Manual redirect for reliability
        const callbackUrl =
          (router.query.callbackUrl as string) || "/video-admin";
        window.location.href = callbackUrl;
      } else {
        setError("Sign in failed. Please try again.");
        setIsSigningIn(false);
      }
    } catch (error) {
      setError("Sign in failed. Please try again.");
      setIsSigningIn(false);
    }
  };

  // Loading state while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Already authenticated
  if (
    status === "authenticated" &&
    session?.user?.email?.endsWith("@freemalaysiatoday.com")
  ) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            Redirecting to admin portal...
          </p>
        </div>
      </div>
    );
  }

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
              <p className="text-sm text-muted-foreground mt-1">
                Use your @freemalaysiatoday.com email
              </p>
            </div>

            {/* Error messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Success message for sign out */}
            {justSignedOut && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  You have been signed out successfully
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Google One Tap button container */}
              <div ref={oneTapRef} className="flex justify-center" />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Manual sign in button */}
              <Button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full"
                size="lg"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Debug info in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs">
              <p>Status: {status}</p>
              <p>Session Email: {session?.user?.email || "None"}</p>
              <p>Callback URL: {router.query.callbackUrl || "None"}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
