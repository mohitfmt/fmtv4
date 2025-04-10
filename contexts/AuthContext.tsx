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

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isExpired(expiryTime: number): boolean {
  return Date.now() > expiryTime;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync user with database when auth state changes
  useEffect(() => {
    async function syncUser() {
      if (user && isAuthenticated) {
        try {
          const response = await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
          });

          if (!response.ok) {
            throw new Error('Failed to sync user data');
          }
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      }
    }

    syncUser();
  }, [user, isAuthenticated]);

  // Check local storage for existing session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAuth = localStorage.getItem("authData");
      if (storedAuth) {
        try {
          const authData: StoredAuthData = JSON.parse(storedAuth);
          
          if (!isExpired(authData.expiry)) {
            setUser(authData.user);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem("authData");
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Error parsing auth data:', error);
          localStorage.removeItem("authData");
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setIsInitialized(true);
    }
  }, []);

  const login = async (userData: GoogleUser, credential?: string) => {
    if (typeof window !== 'undefined') {
      const authData: StoredAuthData = {
        user: userData,
        expiry: Date.now() + TWO_DAYS_MS,
        credential,
      };
      
      localStorage.setItem("authData", JSON.stringify(authData));
      setUser(userData);
      setIsAuthenticated(true);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("authData");
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Don't render children until auth state is initialized
  if (!isInitialized) {
    return null;
  }

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