import { format } from "date-fns";
import TopBarSeparator from "./TopBarSeperator";

const LastUpdatedDateTime = () => {
  return (
    // Bring Last Updated Date time from Sync-Content API
    <div className="hidden xl:flex items-center gap-4">
      <div className="uppercase hidden md:flex flex-col leading-none">
        <div className="tracking-wider text-sm font-extralight">
          Last Updated
        </div>
        <time
          dateTime={new Date().toString()}
          className="font-semibold"
        >{`${format(new Date(), "dd MMM, HH:mm")}`}</time>
      </div>
      <TopBarSeparator />
    </div>
  );
};

export default LastUpdatedDateTime;
