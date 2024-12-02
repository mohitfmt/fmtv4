import { Button } from "@/components/ui/button";
import { SignIn } from "@phosphor-icons/react";

const SignInButton = () => {
  return (
    <Button
      variant="outline"
      size="icon"
      className="bg-background text-foreground border-border br-border border-white border-[0.5px]"
    >
      <SignIn weight="bold" />
      <span className="sr-only">SignIn / Login</span>
    </Button>
  );
};

export default SignInButton;
