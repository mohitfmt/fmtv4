import React from "react";
import { useGoogleLogin } from "@react-oauth/google";
// import { FaFacebook, FaApple } from "react-icons/fa";
import { FaGoogle } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { RxCross2 } from "react-icons/rx";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userData: any) => void;
}

const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const { login } = useAuth();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        if (!tokenResponse.access_token) {
          throw new Error("Invalid token response: access_token missing.");
        }

        const response = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch user info: ${response.statusText}`);
        }

        const userData = await response.json();

        if (!userData.email || !userData.name) {
          throw new Error("Incomplete user info received from Google.");
        }

        login(userData, tokenResponse.access_token);
        onLoginSuccess(userData);
        onClose();
      } catch (error) {
        console.error("Failed to handle Google login:", error);
      }
    },
    onError: () => {
      console.log("Google Login Failed");
    },
  });

  const handleFacebookLogin = () => {
    console.log("Facebook login clicked");
  };

  const handleAppleLogin = () => {
    console.log("Apple login clicked");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-stone-900 rounded-xl w-full max-w-md p-8 relative animate-in fade-in duration-300 shadow-xl">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 focus:outline-none transition-colors"
            aria-label="Close modal"
          >
            <RxCross2 size={25} />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
              Welcome back
            </h2>
            <p className="text-stone-600 dark:text-stone-400">
              Sign in to access your account
            </p>
          </div>

          {/* Sign-in Options */}
          <div className="space-y-4">
            {/* Custom Google Sign In Button */}
            <button
              className="w-full flex items-center justify-center px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-full text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors"
              onClick={() => handleGoogleLogin()}
            >
              <FaGoogle className="w-5 h-5 text-red-600 mr-3" />
              <span className="text-sm font-medium">Sign in with Google</span>
            </button>

            {/* Facebook Sign In */}
            {/* <button
              className="w-full flex items-center justify-center px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-full text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors"
              onClick={handleFacebookLogin}
            >
              <FaFacebook className="w-5 h-5 text-blue-600 mr-3" />
              <span className="text-sm font-medium">Sign in with Facebook</span>
            </button> */}

            {/* Apple Sign In */}
            {/* <button
              className="w-full flex items-center justify-center px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-full text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors"
              onClick={handleAppleLogin}
            >
              <FaApple className="w-5 h-5 mr-3" />
              <span className="text-sm font-medium">Sign in with Apple</span>
            </button> */}

            {/* Terms */}
            <p className="text-xs text-center text-stone-500 dark:text-stone-400 mt-8">
              Click Sign In to agree to Terms of Service and acknowledge that
              FMTs Privacy Policy applies to you.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignInModal;
