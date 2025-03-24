import { PostCardProps } from "@/types/global";
import CategoryHeroPost from "../../common/news-preview-cards/CategoryHeroPost";
import AdSlot from "../../common/AdSlot";
import SectionHeading from "../../common/SectionHeading";
import TTBNewsPreview from "../../common/news-preview-cards/TTBNewsPreview";
import SubCategoryOtherPosts from "./SubCaterogyOtherPosts";
import MainLayout from "../MainLayout";

interface PostsData {
  edges: Array<{
    node: PostCardProps;
  }>;
}

interface SubCategoryPostLayoutProps {
  title: string;
  posts: PostsData;
  AdsTargetingParams: {
    pos: string;
    section: string[];
    key: string[];
  };
  categorySlug: string;
}

export const SubCategoryPostLayout = ({
  title,
  categorySlug,
  posts,
  AdsTargetingParams,
}: SubCategoryPostLayoutProps) => {
  if (!posts?.edges?.length) return null;

  const heroPost = posts.edges[0];
  const horizontalPosts = {
    edges: posts.edges.slice(1, 5),
  };
  const otherPosts = {
    edges: posts.edges.slice(5),
  };

  return (
    <MainLayout adsTargetingParams={AdsTargetingParams}>
      <SectionHeading sectionName={title} />

      {/* Featured Posts Section */}
      <section className="mt-4">
        {heroPost && (
          <CategoryHeroPost
            key={`hero-${title}-${heroPost.node.id}`}
            post={heroPost.node}
            eagerLoadImage={true}
          />
        )}

        {/* Mobile Ad */}
        <div className="ads-medium-mobile">
          <AdSlot
            id="div-gpt-ad-1661333336129-0"
            name="ROS_Midrec"
            sizes={[300, 250]}
            visibleOnDevices="onlyMobile"
            targetingParams={AdsTargetingParams}
          />
        </div>
      </section>

      {/* Horizontal Load More Section */}
      <section className="relative z-0 overflow-hidden mt-8">
        <div
          key={`horizontal-${title}`}
          className="w-full grid grid-cols-2 gap-4 sm:mt-4 md:grid-cols-4"
        >
          {horizontalPosts.edges.map(({ node }) => (
            <TTBNewsPreview {...node} key={`${title}-${node.id}`} />
          ))}
        </div>
      </section>

      <div className="ads-medium-mobile">
        <AdSlot
          id="div-gpt-ad-1661355704641-0"
          name="ROS_Midrec_b"
          sizes={[300, 250]}
          visibleOnDevices="onlyMobile"
          targetingParams={AdsTargetingParams}
        />
      </div>

      {/* Category Other Posts */}
      <div key={`other-posts-${title}`}>
        <SubCategoryOtherPosts
          initialPosts={otherPosts}
          categorySlug={categorySlug}
          startingOffset={5}
          bigImage={true}
        />
      </div>

      <div className="ads-tall-mobile">
        <AdSlot
          id="div-gpt-ad-1661355926077-0"
          name="ROS_Halfpage"
          sizes={[300, 600]}
          visibleOnDevices="onlyMobile"
          targetingParams={AdsTargetingParams}
        />
      </div>
    </MainLayout>
  );
};
