import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
// import { SignIn } from "@phosphor-icons/react";
import PopText from "@/components/common/PopText";
import { FaSignInAlt } from "react-icons/fa";

const SignInButton = () => {
  const { data: session } = useSession();

  const handleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };

  const handleSignOut = () => signOut();

  return (
    <div>
      {session ? (
        <PopText content="Sign Out" position="bottom">
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="icon"
            aria-label="Sign Out"
          >
            <Image
              src={session?.user?.image || "/icon-256x256.png"}
              width={37.5}
              height={37.5}
              className="rounded hover:opacity-70"
              alt={`Profile picture of ${session?.user?.name || "unknown user"}`}
            />
          </Button>
        </PopText>
      ) : (
        <PopText content="Sign In" position="bottom">
          <Button
            onClick={handleSignIn}
            variant="outline"
            size="icon"
            className="lg:flex bg-transparent hover:bg-accent-yellow dark:text-white lg:text-white border-black dark:border-white lg:border-white br-border"
            aria-label="Sign In"
          >
            <FaSignInAlt />
          </Button>
        </PopText>
      )}
    </div>
  );
};

export default SignInButton;
