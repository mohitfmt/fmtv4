import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

const SignInButton = () => {
  return (
    <Button
      variant="outline"
      size="icon"
      className="bg-background border-border"
    >
      <LogIn className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">SignIn / Login</span>
    </Button>
  );
};

export default SignInButton;
