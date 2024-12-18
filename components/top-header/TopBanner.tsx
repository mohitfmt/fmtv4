import TopNavbar from "./top-banner/TopNavbar";
import { navigation } from "@/constants/navigation";
import MobileNavbar from "./top-banner/MobileNavbar";
import { LogoSVG } from "../ui/icons/LogoSVG";
import SearchNews from "./top-bar/SearchNews";
import Link from "next/link";
import AdSlot from "../common/AdSlot";
import { nanoid } from "nanoid";

export default function TopBanner() {
  return (
    <>
      <header className="sticky lg:-top-20 top-10 z-20 bg-background br-b border-stone-400">
        <div className="flex flex-row items-center justify-between py-2">
          <Link
            href={`/?${nanoid()}`}
            aria-label="Free Malaysia Today - Return to homepage"
            className="flex flex-col items-center"
          >
            <LogoSVG
              className="h-10 w-20 md:h-20 md:w-40"
              role="img"
              aria-label="Free Malaysia Today - Logo SVG"
            />

            <span className="sr-only">Home</span>
          </Link>
          <div className="hidden xl:flex items-center justify-center w-full h-24 rounded-md mx-5">
            <AdSlot
              name="ROS_Multisize_Leaderboard"
              sizes={[
                [970, 90],
                [728, 90],
              ]}
              id="div-gpt-ad-1661417956793-0"
            />
          </div>

          <div className="flex items-center lg:hidden">
            <SearchNews />
            <MobileNavbar navigation={navigation} />
          </div>
        </div>
      </header>
      <div className="lg:sticky top-[55px] bg-background z-30">
        <TopNavbar navigation={navigation} />
      </div>
    </>
  );
}
