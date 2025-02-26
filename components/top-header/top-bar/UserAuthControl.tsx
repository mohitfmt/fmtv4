import React, { useState } from "react";
import { useGoogleOneTapLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import Image from "next/image";
import SignInModal from "./SignInModal";
import { Button } from "@/components/ui/button";
import PopText from "@/components/common/PopText";
import { FaSignInAlt } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  email_verified: boolean;
}

interface CredentialResponse {
  credential?: string;
  select_by: string;
}

export default function UserAuthControl() {
  const { login, logout, user } = useAuth();
  const [showSignInOptions, setShowSignInOptions] = useState(false);

  const handleLoginSuccess = (credRes: CredentialResponse) => {
    if (credRes.credential) {
      const decodedToken = jwtDecode<GoogleUser>(credRes.credential);
      const userInfo: GoogleUser = {
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        given_name: decodedToken.given_name,
        family_name: decodedToken.family_name,
        email_verified: decodedToken.email_verified,
      };

      // Pass both user info and credential to login
      login(userInfo, credRes.credential);
      setShowSignInOptions(false);
    }
  };

  useGoogleOneTapLogin({
    onError: () => {
      console.error("One Tap Login Failed");
    },
    // @ts-expect-error :ignoring onSuccess Error
    onSuccess: handleLoginSuccess,
    googleAccountConfigs: {
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!, //i.e. id can't be null/undefined
    },
    disabled: !!user, //to convert user to boolean and check logged in or not.
  });

  return (
    <>
      {user ? (
        <PopText content="Sign Out" position="bottom">
          <Button
            onClick={logout}
            variant="outline"
            size="icon"
            aria-label="Sign Out"
          >
            <Image
              src={user?.picture || "/icon-256x256.png"}
              width={40}
              height={40}
              className="rounded hover:opacity-70"
              alt={`Profile picture of ${user?.name || "unknown user"}`}
            />
          </Button>
        </PopText>
      ) : (
        <>
          <SignInButton onClick={() => setShowSignInOptions(true)} />
          <SignInModal
            isOpen={showSignInOptions}
            onClose={() => setShowSignInOptions(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        </>
      )}
    </>
  );
}

interface SignInButtonProps {
  onClick: () => void;
}

const SignInButton: React.FC<SignInButtonProps> = ({ onClick }) => {
  return (
    <PopText content="Sign In" position="bottom">
      <Button
        onClick={onClick}
        variant="outline"
        size="icon"
        className="lg:flex bg-transparent hover:bg-accent-yellow dark:text-white lg:text-white border-black dark:border-white lg:border-white br-border"
        aria-label="Sign In"
      >
        <FaSignInAlt />
      </Button>
    </PopText>
  );
};
