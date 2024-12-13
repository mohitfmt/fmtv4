// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";

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

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isExpired(expiryTime: number): boolean {
  return Date.now() > expiryTime;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for stored user data on mount
    const storedAuth = localStorage.getItem("authData");
    if (storedAuth) {
      const authData: StoredAuthData = JSON.parse(storedAuth);

      // Check if the stored data is expired
      if (!isExpired(authData.expiry)) {
        setUser(authData.user);
        setIsAuthenticated(true);
      } else {
        // Clear expired data
        localStorage.removeItem("authData");
        setUser(null);
        setIsAuthenticated(false);
      }
    }
  }, []);

  const login = (userData: GoogleUser, credential?: string) => {
    const authData: StoredAuthData = {
      user: userData,
      expiry: Date.now() + TWO_DAYS_MS,
      credential,
    };

    localStorage.setItem("authData", JSON.stringify(authData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("authData");
    setUser(null);
    setIsAuthenticated(false);
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
