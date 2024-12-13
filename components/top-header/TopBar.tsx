import { ThemeToggle } from "./top-bar/ThemeToggle";
import Headlines from "./top-bar/Headlines";
import LastUpdatedDateTime from "./top-bar/LastUpdatedDateTime";
import NewsletterButton from "./top-bar/NewsletterButton";
import SearchNews from "./top-bar/SearchNews";
import { SocialIcons } from "./top-bar/SocialIcons";
import TopBarSeparator from "./top-bar/TopBarSeperator";
import UserAuthControl from "./top-bar/UserAuthControl";

const TopBar = () => {
  return (
    <section className="sticky top-0 z-50 flex bg-stone-800 text-stone-100 justify-between items-center p-2 gap-4">
      <LastUpdatedDateTime />
      <Headlines />
      <div className="hidden lg:block">
        <SearchNews />
      </div>
      <NewsletterButton />
      <TopBarSeparator />
      <div className="hidden lg:flex">
        <SocialIcons iconClassName="hover:text-accent-yellow" />
      </div>
      <TopBarSeparator />
      <div className="hidden lg:flex gap-3">
        <UserAuthControl />
        <ThemeToggle />
      </div>
    </section>
  );
};

export default TopBar;
