import { Button } from "@/components/ui/button";
import { SignIn } from "@phosphor-icons/react";

const SignInButton = () => {
  return (
    <Button
      variant="outline"
      size="icon"
      className="lg:flex bg-transparent  hover:bg-accent-yellow dark:text-white lg:text-white border-black  dark:border-white lg:border-white br-border "
    >
      <SignIn weight="bold" />
      <span className="sr-only">SignIn / Login</span>
    </Button>
  );
};

export default SignInButton;
