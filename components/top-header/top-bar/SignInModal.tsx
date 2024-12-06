import { GoogleLogo, FacebookLogo, AppleLogo, X } from "@phosphor-icons/react";
import Link from "next/link";
import { signIn } from "next-auth/react";

const SignInModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  const loginOptions = [
    {
      name: "Google",
      icon: <GoogleLogo className="text-red-500 mr-3" size={20} />,
      action: () => signIn("google"),
    },
    {
      name: "Facebook",
      icon: <FacebookLogo className="text-blue-600 mr-3" size={20} />,
      action: () => signIn("facebook"),
    },
    {
      name: "Apple",
      icon: <AppleLogo className="text-black dark:text-white mr-3" size={20} />,
      action: () => signIn("apple"),
    },
    {
      name: "Email",
      icon: <span className="text-gray-500 mr-3">@</span>,
      action: () => signIn("email"),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-background text-foreground w-11/12 max-w-md p-6 rounded shadow-lg relative">
        {/* Close Button */}
        <button
          className="absolute top-2 right-2 text-stone-500 hover:text-foreground focus:outline-none"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        {/* Header */}
        <h2 className="text-center text-xl font-semibold mb-6">
          Welcome to FMT
        </h2>

        {/* Sign-In Options */}
        <div className="space-y-4">
          {loginOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                onClose();
                option.action();
              }}
              className="flex items-center justify-center w-full border border-stone-400 dark:border-stone-700 rounded-full py-2 hover:bg-stone-200 dark:hover:bg-stone-700"
            >
              {option.icon}
              <span>Sign in with {option.name}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          
          <p className="text-xs mt-4 text-gray-600 dark:text-gray-400">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-accent-blue hover:underline">
              Terms of Service
            </Link>{" "}
            and acknowledge our{" "}
            <Link href="/privacy" className="text-accent-blue hover:underline">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInModal;
