import { ThemeToggle } from "./top-bar/ThemeToggle";
import Headlines from "./top-bar/Headlines";
import LastUpdatedDateTime from "./top-bar/LastUpdatedDateTime";
import NewsletterButton from "./top-bar/NewsletterButton";
import SearchNews from "./top-bar/SearchNews";
import SignInButton from "./top-bar/SignInButton";
import { SocialIcons } from "./top-bar/SocialIcons";
import TopBarSeperator from "./top-bar/TopBarSeperator";

const TopBar = () => {
  return (
    <section className="sticky top-0 z-50 flex bg-stone-800 text-stone-100 justify-between items-center p-2 gap-1">
      <LastUpdatedDateTime />
      <Headlines />
      <SearchNews />
      <TopBarSeperator />
      <NewsletterButton />
      <TopBarSeperator />
      <SocialIcons iconClassName="text-2xl hover:text-accent-yellow" />
      <TopBarSeperator />
      <SignInButton />
      <ThemeToggle />
    </section>
  );
};

export default TopBar;
