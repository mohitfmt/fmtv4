import TopNavbar from "./top-banner/TopNavbar";
import { navigation } from "@/constants/navigation";
import MobileNavbar from "./top-banner/MobileNavbar";
import Logo from "./top-banner/Logo";

export default function TopBanner() {
  return (
    <>
      <header>
        <div className="flex flex-row items-center justify-between p-2">
          <Logo />
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
