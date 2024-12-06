import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SignIn } from "@phosphor-icons/react";
import Tooltip from "@/components/common/Tooltip";
// import SignInModal from "./SignInModal"; // Uncomment this line if the custom modal is needed in the future

const SignInButton = () => {
  const { data: session } = useSession();

  // Uncomment the state and handlers below if using the custom modal in the future
  // const [isModalOpen, setIsModalOpen] = useState(false);

  // const handleOpenModal = () => setIsModalOpen(true);
  // const handleCloseModal = () => setIsModalOpen(false);

  const handleSignIn = () => {
    // Use Google sign-in directly
    signIn("google", { callbackUrl: "/" });
  };

  const handleSignOut = () => signOut();

  return (
    <div>
      {session ? (
        <Tooltip text="Sign Out" position="bottom">
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
        </Tooltip>
      ) : (
        <Tooltip text="Sign In" position="bottom">
          <Button
            onClick={handleSignIn} // Trigger Google sign-in directly
            variant="outline"
            size="icon"
            className="lg:flex bg-transparent hover:bg-accent-yellow dark:text-white lg:text-white border-black dark:border-white lg:border-white br-border"
            aria-label="Sign In"
          >
            <SignIn weight="bold" />
          </Button>
        </Tooltip>
      )}

      {/* 
      Uncomment this section if you want to use the custom modal in the future:
      <SignInModal isOpen={isModalOpen} onClose={handleCloseModal} />
      */}
    </div>
  );
};

export default SignInButton;
