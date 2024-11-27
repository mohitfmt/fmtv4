import { format } from "date-fns";
import { ThemeToggle } from "../ThemeToggle";
import Headlines from "./Headlines";

const TopBar = () => {
  return (
    <section className="flex bg-stone-800 text-stone-100 justify-between items-center px-2">
      {/* Will have last updated date time Mon, 18 Nov, 2024 at 12:32 
      this time will come from CMS last updated time */}
      <div className="p-2 text-sm uppercase hidden md:flex flex-col">
        <div className="font-bold tracking-widest">Last Updated at</div>
        <time dateTime={new Date().toString()} className="text-xs">{`${format(
          new Date(),
          "E, dd MMM, yyyy hh:mm"
        )}`}</time>
      </div>
      <Headlines />
      search-box newsletter social-icons sigin-button
      <ThemeToggle />
    </section>
  );
};

export default TopBar;
