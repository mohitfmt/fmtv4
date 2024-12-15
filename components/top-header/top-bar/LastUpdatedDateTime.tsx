import { format } from "date-fns";
import TopBarSeparator from "./TopBarSeperator";
import useSWR from "swr";
import { fetchLastUpdateTime } from "@/lib/utils";

const LastUpdatedDateTime = () => {
  const { data, error } = useSWR("/api/last-update", fetchLastUpdateTime, {
    refreshInterval: 0, // Disable automatic revalidation
  });
  if (error || !data) return null;
  return (
    <div className="hidden xl:flex items-center gap-4">
      <div className="uppercase hidden md:flex flex-col leading-none">
        <div className="tracking-wider text-sm font-extralight">
          Last Updated
        </div>
        <time
          dateTime={data.lastUpdateTime}
          className="font-semibold"
        >{`${format(new Date(data.lastUpdateTime), "dd MMM, HH:mm")}`}</time>
      </div>
      <TopBarSeparator />
    </div>
  );
};

export default LastUpdatedDateTime;
