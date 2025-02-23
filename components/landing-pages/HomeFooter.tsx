import { PostCardProps } from "@/types/global";
import LTRNewsPreview from "../common/news-preview-cards/LTRNewsPreview";
import DownloadApps from "./DownloadApps";
import MostViewed from "../common/most-viewed/MostViewed";
import SectionHeading from "../common/SectionHeading";

interface HomeFooterProps {
  currentHighlightPosts: { node: PostCardProps }[];
}

const HomeFooter = ({ currentHighlightPosts }: HomeFooterProps) => {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 pb-2 ">
        <section>
          {/* <h2 className="text-2xl font-extrabold">
            Most Viewed Last 2 Days
          </h2> */}
          <SectionHeading sectionName="Most Viewed Last 2 Days"/> 
          <div className="flex flex-col gap-4">
            <MostViewed isFooter={true} />
          </div>
        </section>

        <section>
          {/* <h2 className="text-2xl font-extrabold">
            Current Highlights
          </h2> */}
          <SectionHeading sectionName="Current Highlights"/>
          <div className="mt-4 flex flex-col gap-4">
            {currentHighlightPosts
              ?.slice(0, 3)
              ?.map((item: any) => (
                <LTRNewsPreview
                  key={item.uri}
                  title={item.title}
                  uri={item.uri}
                  slug={item.slug}
                  date={item.date}
                  featuredImage={item.featuredImage}
                  categories={item.categories}
                />
              ))}
          </div>
        </section>

        <section>
          <DownloadApps />
        </section>
      </div>
    </>
  );
};

export default HomeFooter;
