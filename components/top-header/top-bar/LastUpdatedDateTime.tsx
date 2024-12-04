import { format } from "date-fns";

const LastUpdatedDateTime = () => {
  return (
    // Bring Last Updated Date time from Sync-Content API
    <div className="flex items-center gap-1">
      <div className="text-sm uppercase hidden md:flex flex-col">
        <div className="tracking-widest text-xs">Last Updated</div>
        <time
          dateTime={new Date().toString()}
          className="font-semibold tracking-tighter text-xs "
        >{`${format(new Date(), "E, dd MMM, yyyy")}`}</time>
      </div>
      <p className="font-black md:text-lg text-sm hidden md:block">{`${format(new Date(), "HH:mm")}`}</p>

      
     
    </div>
  );
};

export default LastUpdatedDateTime;
