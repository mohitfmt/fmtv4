import TopNavbar from "./top-banner/TopNavbar";
import { navigation } from "@/constants/navigation";
import MobileNavbar from "./top-banner/MobileNavbar";
import { LogoSVG } from "../ui/icons/LogoSVG";
import Link from "next/link";

export default function TopBanner() {
  return (
    <>
      <header>
        <div className="flex flex-row items-center justify-between p-2">
          <Link
            href="/"
            aria-label="Free Malaysia Today - Return to homepage"
            className="flex flex-col items-center"
          >
            <LogoSVG className="h-10 w-20 md:h-20 md:w-40" role="img"
              aria-label="Free Malaysia Today - Logo SVG" />

            <span className="sr-only">Home</span>
          </Link>
          <div className="hidden xl:flex items-center justify-center w-full h-24 rounded-md mx-5">
            {/* Ad Slot */}
          </div>

          <div>
            <MobileNavbar navigation={navigation} />
          </div>
        </div>
      </header>
      <div className="sticky top-[52.5px] z-8 bg-background z-9 ">
        <TopNavbar navigation={navigation} />
      </div>
    </>
  );
}
