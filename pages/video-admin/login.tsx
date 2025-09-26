// pages/video-admin/login.tsx - Clean version without NextAuth
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useGoogleLogin, useGoogleOneTapLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogoSVG } from "@/components/ui/icons/LogoSVG";
import {
  FiShield,
  FiLoader,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";
import { FaGoogle } from "react-icons/fa";
import Cookies from "js-cookie";

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  email_verified: boolean;
  sub?: string;
}

interface CredentialResponse {
  credential?: string;
  select_by: string;
}

const ALLOWED_DOMAIN = "@freemalaysiatoday.com";

export default function VideoAdminLogin() {
  const router = useRouter();
  const { user, login, logout } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSignedOut, setJustSignedOut] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = () => {
      // Check if user just signed out
      if (sessionStorage.getItem("admin_signed_out") === "true") {
        setJustSignedOut(true);
        sessionStorage.removeItem("admin_signed_out");
        // Clear any existing auth
        Cookies.remove("admin_auth");
        logout();
      }

      // If user is authenticated and has valid domain
      if (user && user.email.endsWith(ALLOWED_DOMAIN)) {
        // Set cookie for middleware
        Cookies.set("admin_auth", "true", {
          expires: 7,
          path: "/",
          sameSite: "lax",
        });
        const redirectUrl =
          (router.query.callbackUrl as string) || "/video-admin";
        router.push(redirectUrl);
      }

      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [user, router, logout]);

  // Handle successful login with domain validation
  const handleLoginSuccess = async (
    userData: GoogleUser,
    credential?: string
  ) => {
    // Domain validation
    if (!userData.email.endsWith(ALLOWED_DOMAIN)) {
      setError(
        `Access denied. Please use your ${ALLOWED_DOMAIN} email address.`
      );
      setIsSigningIn(false);
      return;
    }

    try {
      // Set cookie for middleware to check
      Cookies.set("admin_auth", "true", {
        expires: 7,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      Cookies.set("user_email", userData.email);

      // Set admin-specific flag in localStorage
      localStorage.setItem("adminUser", "true");

      // Use the existing AuthContext login
      login(userData, credential);

      // Log admin action (simple console log for now)
      console.log(
        `[Admin Login] ${userData.email} logged in at ${new Date().toISOString()}`
      );

      // Redirect to video-admin or callback URL
      const redirectUrl =
        (router.query.callbackUrl as string) || "/video-admin";
      router.push(redirectUrl);
    } catch (error) {
      console.error("Failed to set admin auth:", error);
      setError("Authentication setup failed. Please try again.");
      setIsSigningIn(false);
    }
  };

  // Google One Tap Login
  const handleOneTapResponse = (credRes: CredentialResponse) => {
    if (credRes.credential) {
      setIsSigningIn(true);
      setError(null);

      try {
        const decodedToken = jwtDecode<GoogleUser>(credRes.credential);
        handleLoginSuccess(decodedToken, credRes.credential);
      } catch (error) {
        console.error("Failed to decode token:", error);
        setError("Authentication failed. Please try again.");
        setIsSigningIn(false);
      }
    }
  };

  // Initialize Google One Tap
  useGoogleOneTapLogin({
    onSuccess: handleOneTapResponse as any,
    onError: () => {
      console.error("One Tap Login Failed");
    },
    disabled: !!user || justSignedOut || isSigningIn,
  });

  // Google OAuth Login
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsSigningIn(true);
      setError(null);

      try {
        // Fetch user info from Google
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch user info");
        }

        const userData = await response.json();
        await handleLoginSuccess(userData, tokenResponse.access_token);
      } catch (error) {
        console.error("Login failed:", error);
        setError("Authentication failed. Please try again.");
        setIsSigningIn(false);
      }
    },
    onError: () => {
      setError("Google login failed. Please try again.");
      setIsSigningIn(false);
    },
  });

  // Show loading while checking initial auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If already authenticated with valid domain, show redirecting
  if (user && user.email.endsWith(ALLOWED_DOMAIN)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FiCheckCircle className="w-8 h-8 text-green-600 mx-auto mb-4" />
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
              <FiShield className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-foreground">
                Sign In Required
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Use your @freemalaysiatoday.com email
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
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
                  You have been signed out successfully.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Google Sign In Button */}
              <Button
                onClick={() => googleLogin()}
                disabled={isSigningIn}
                className="w-full"
                size="lg"
              >
                {isSigningIn ? (
                  <>
                    <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <FaGoogle className="w-4 h-4 mr-3 text-red-600" />
                    Sign in with Google
                  </>
                )}
              </Button>

              {/* Additional info */}
              <p className="text-xs text-center text-muted-foreground">
                By signing in, you agree to FMTs Terms of Service and Privacy
                Policy. Access is restricted to @freemalaysiatoday.com emails
                only.
              </p>
            </div>
          </div>

          {/* Debug info in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs">
              <p>Current User: {user?.email || "None"}</p>
              <p>Callback URL: {router.query.callbackUrl || "None"}</p>
              <p>
                Is Admin: {user?.email?.endsWith(ALLOWED_DOMAIN) ? "Yes" : "No"}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
