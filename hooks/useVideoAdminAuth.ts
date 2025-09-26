// hooks/useVideoAdminAuth.ts - Reusable auth check for video-admin pages
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import Cookies from "js-cookie";

const ALLOWED_DOMAIN = "@freemalaysiatoday.com";

export function useVideoAdminAuth() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      // No user or invalid domain
      if (!user || !user.email.endsWith(ALLOWED_DOMAIN)) {
        // Clear any stale cookie
        Cookies.remove("admin_auth");
        // Redirect to login
        router.push("/video-admin/login");
        setIsAuthorized(false);
      } else {
        // Valid admin user - ensure cookie is set
        Cookies.set("admin_auth", "true", {
          expires: 7,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
        setIsAuthorized(true);
      }
      setIsChecking(false);
    };

    checkAuth();
  }, [user, router]);

  return {
    user,
    isAuthorized,
    isChecking,
    userEmail: user?.email,
    userName: user?.name,
    userPicture: user?.picture,
  };
}
