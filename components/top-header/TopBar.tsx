import { ThemeToggle } from "./top-bar/ThemeToggle";
import Headlines from "./top-bar/Headlines";
import LastUpdatedDateTime from "./top-bar/LastUpdatedDateTime";
import NewsletterButton from "./top-bar/NewsletterButton";
import SearchNews from "./top-bar/SearchNews";
import SignInButton from "./top-bar/SignInButton";
import { SocialIcons } from "./top-bar/SocialIcons";

const TopBar = () => {
  return (
    <section className="sticky top-0 z-10 flex bg-stone-800 text-stone-100 justify-between items-center p-2 gap-2">
      <LastUpdatedDateTime />
      <span className="hidden md:block border-l-[0.5px] h-10 border-stone-500 mx-1" />
      <Headlines />
      <span className="hidden md:block border-l-[0.5px] h-10 border-stone-500 mx-1" />
      <SearchNews />
      <span className="hidden md:block border-l-[0.5px] h-10 border-stone-500 mx-1" />
      <NewsletterButton />
      <span className="hidden md:block border-l-[0.5px] h-10 border-stone-500 mx-1" />
      <SocialIcons />
      <SignInButton />
      <ThemeToggle />
    </section>
  );
};

export default TopBar;
