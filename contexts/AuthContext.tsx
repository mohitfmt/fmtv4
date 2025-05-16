import type React from "react";
import { createContext, useContext, useState, useEffect, useRef } from "react";

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  email_verified: boolean;
}

interface StoredAuthData {
  user: GoogleUser;
  expiry: number;
  credential?: string;
}

interface AuthContextType {
  user: GoogleUser | null;
  setUser: (user: GoogleUser | null) => void;
  isAuthenticated: boolean;
  login: (userData: GoogleUser, credential?: string) => void;
  logout: () => void;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

// Global initialization tracker
let isInitializing = false;

function isExpired(expiryTime: number): boolean {
  return Date.now() > expiryTime;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initRef = useRef(false);

  // Initialize auth state once
  useEffect(() => {
    // Skip if already initialized or currently initializing
    if (initRef.current || isInitializing || typeof window === "undefined") {
      return;
    }

    // Set flags to prevent concurrent initialization
    isInitializing = true;
    initRef.current = true;

    try {
      const storedAuth = localStorage.getItem("authData");
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        if (!isExpired(authData.expiry)) {
          setUser(authData.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("authData");
        }
      }
    } catch (error) {
      console.warn("Auth initialization error:", error);
      localStorage.removeItem("authData");
    } finally {
      isInitializing = false;
    }
  }, []);

  // Sync user with backend with debounce and request cancellation
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    // Clear any existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Set new timeout for sync
    syncTimeoutRef.current = setTimeout(() => {
      const controller = new AbortController();

      fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
        signal: controller.signal,
      }).catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("Sync error:", err);
        }
      });

      // Clean up controller after 5 seconds to prevent memory leaks
      setTimeout(() => {
        controller.abort();
      }, 5000);
    }, 1000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [user, isAuthenticated]);

  const login = (userData: GoogleUser, credential?: string) => {
    try {
      const authData: StoredAuthData = {
        user: userData,
        expiry: Date.now() + TWO_DAYS_MS,
        credential,
      };

      localStorage.setItem("authData", JSON.stringify(authData));
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("authData");
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
