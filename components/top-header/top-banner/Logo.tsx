import { LogoSVG } from "@/components/ui/icons/LogoSVG";
import Link from "next/link";

const Logo = () => {
  return (
    <Link
      href="/"
      aria-label="Free Malaysia Today - Return to homepage"
      className="flex flex-col items-center"
    >
      <LogoSVG className="h-10 w-20 md:h-20 md:w-40" role="img"
        aria-label="Free Malaysia Today - Logo SVG" />
      {/* <h1 className="text-2xl md:text-4xl pl-1 font-bold tracking-widest -mt-2 uppercase font-orbitron">
        NEWS
      </h1> */}
      <span className="sr-only">Home</span>
    </Link>
  );
};

export default Logo;
