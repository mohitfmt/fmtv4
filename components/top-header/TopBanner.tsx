import TopNavbar from "./top-banner/TopNavbar";
import { navigation } from "@/constants/navigation";
import MobileNavbar from "./top-banner/MobileNavbar";
import { LogoSVG } from "../ui/icons/LogoSVG";
import SearchNews from "./top-bar/SearchNews";
import Link from "next/link";
import AdSlot from "../common/AdSlot";
import { useStableId } from "@/hooks/useStableId";

const dfpTargetingParams = {
  pos: "listing",
  section: ["homepage", "business", "opinion", "world", "lifestyle", "sports"],
  key: [
    "Free Malaysia Today",
    "Malaysia News",
    "Latest Malaysia News",
    "Breaking News Malaysia",
    "Malaysia Politics News",
    "gambling",
    "religion",
    "alcohol",
    "lgbt",
    "sex",
    "drug abuse",
    "get rich",
    "match-making",
    "dating",
    "lottery",
  ],
};

export default function TopBanner() {
  const { id, refreshId } = useStableId();
  return (
    <>
      <header className="max-w-[1440px] mx-auto sticky overflow-hidden px-2 md:px-4 lg:-top-20 top-10  z-40 bg-background br-b border-stone-400">
        <div className="flex flex-row items-center justify-between py-2">
          <Link
            href={id ? `/?${id}` : "/"}
            onClick={refreshId}
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
          <div className="ad-top-banner-desktop">
            <AdSlot
              name="ROS_Multisize_Leaderboard"
              sizes={[
                [970, 90],
                [728, 90],
              ]}
              id="div-gpt-ad-1661417956793-0"
              visibleOnDevices="onlyDesktop"
              targetingParams={dfpTargetingParams}
            />
          </div>

          <div className="flex items-center lg:hidden">
            <SearchNews />
            <MobileNavbar navigation={navigation} />
          </div>
        </div>
      </header>
      <div className="lg:sticky max-w-[1440px] mx-auto px-2 md:px-4 top-[55px] bg-background z-30">
        <TopNavbar navigation={navigation} />
      </div>
    </>
  );
}
