import TopBanner from "./TopBanner";
import TopBar from "./TopBar";

// Last updated date time
// Headlines
// User Details if Available (Else anonymous user) Global State

const TopHeader = () => {
  return (
    <div>
      <TopBar />
      <TopBanner />
    </div>
  );
};

export default TopHeader;
