import { ThemeToggle } from "./top-bar/ThemeToggle";
import Headlines from "./top-bar/Headlines";
import LastUpdatedDateTime from "./top-bar/LastUpdatedDateTime";
import NewsletterButton from "./top-bar/NewsletterButton";
import SearchNews from "./top-bar/SearchNews";
import SignInButton from "./top-bar/SignInButton";
import { SocialIcons } from "./top-bar/SocialIcons";
import TopBarSeparator from "./top-bar/TopBarSeperator";

const TopBar = () => {
  return (
    <section className="sticky top-0 z-50 flex bg-stone-800 text-stone-100 justify-between items-center p-2 gap-1">
      <LastUpdatedDateTime />
      <Headlines />

      <div className="hidden lg:block">
        <SearchNews />
      </div>

      <TopBarSeparator />
      <NewsletterButton />
      <TopBarSeparator />

      <div className="hidden lg:flex">
        <SocialIcons
          iconClassName="text-2xl hover:text-accent-yellow justify-center"
          className="flex gap-1"
        />
      </div>

      <TopBarSeparator />

      <div className="hidden lg:flex">
        <SignInButton />
        <ThemeToggle />
      </div>
    </section>
  );
};

export default TopBar;
