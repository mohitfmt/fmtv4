import React from "react";
import SectionHeading from "../common/SectionHeading";
import SearchForm from "./SearchForm";
import SearchWithLoadMore from "./SearchWithLoadMore";
import CategorySidebar from "../common/CategorySidebar";
import { useRouter } from "next/router";
import AdSlot from "../common/AdSlot";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";
// import AdSlot from "../common/AdSlot";

export default function SearchLayout() {
  const router = useRouter();
  const { term, category } = router.query;

  const dfpTargetingParams = {
    pos: "listing",
    section: ["search", term],
    key: [term, category, ...gerneralTargetingKeys],
  };
  return (
    <>
      {/* Top Desktop Ad */}
      {/* <div className="ads-dynamic-desktop">
        <AdSlot
          sizes={[
            [970, 90],
            [970, 250],
            [728, 90],
          ]}
          id="div-gpt-ad-1661333181124-0"
          name="ROS_Billboard"
          visibleOnDevices="onlyDesktop"
        />
      </div> */}
      {/* Top Mobile Ad */}
      {/* <div className="ads-small-mobile">
        <AdSlot
          sizes={[
            [320, 50],
            [320, 100],
          ]}
          id="div-gpt-ad-1661362470988-0"
          name="ROS_Mobile_Leaderboard"
          visibleOnDevices="onlyMobile"
        />
      </div> */}

      <section className="flex flex-col gap-10 lg:flex-row my-6">
        <main className="lg:w-2/3">
          <SectionHeading sectionName="Search Results" specialPage />
          <SearchForm />
          <SearchWithLoadMore term={term} category={category} />
        </main>

        <aside className="lg:w-1/3">
          <CategorySidebar pageName="categoryHome" />
        </aside>

        {/* Pixel Ad */}
        <AdSlot
          id="div-gpt-ad-1661362827551-0"
          name="Pixel"
          targetingParams={dfpTargetingParams}
          sizes={[1, 1]}
          additionalStyle={{
            position: "absolute",
            top: 0,
            left: 0,
            backgroundColor: "var(--muted)",
            height: 0,
          }}
        />

        {/* OutOfPage Ad */}
        {/* <AdSlot
          id="div-gpt-ad-1661362765847-0"
          name="OutOfPage"
          sizes={[1, 1]}
          outOfPage={true}
          targetingParams={dfpTargetingParams}
          additionalStyle={{
            position: "absolute",
            top: 0,
            left: 0,
            backgroundColor: "var(--muted)",
            height: 0,
          }}
        /> */}
      </section>
    </>
  );
}
