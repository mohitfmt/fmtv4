import { PostCardProps } from "@/types/global";
import CategorySidebar from "../common/CategorySidebar";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import SectionHeading from "../common/SectionHeading";
import TagPostsWithLoadMore from "./TagsWithLoadMores";
import AdSlot from "../common/AdSlot";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";

interface Posts {
  edges: Array<{
    node: PostCardProps;
  }>;
}

interface TagLayoutProps {
  title: string;
  posts: Posts;
  tagId: string;
}

export default function TagLayout({ title, posts, tagId }: TagLayoutProps) {
  // Take first 5 posts for the top grid
  const topPosts = posts.edges.slice(0, 4);

  // Prepare initial posts for load more (remaining posts)
  const initialLoadMorePosts = {
    ...posts,
    edges: posts.edges.slice(4),
  };

  const dfpTargetingParams = {
    pos: "listing",
    section: "tags",
    key: [title, ...gerneralTargetingKeys],
  };

  return (
    <div className="py-2">
      <div className="flex flex-col my-5 gap-10 lg:flex-row">
        <main className="lg:w-2/3">
          <SectionHeading sectionName={title} specialPage />

          {/* Top Posts Grid */}
          <div
            key={`horizontal-${title}`}
            className="w-full grid grid-cols-2 gap-4 sm:mt-4 md:grid-cols-4"
          >
            {topPosts.map(({ node }) => (
              <TTBNewsPreview
                {...node}
                key={`${title}-${node.id}`}
                isSpecialPage
              />
            ))}
          </div>

          {/* Additional Tag Posts with Load More */}

          <TagPostsWithLoadMore
            tagId={tagId}
            initialPosts={initialLoadMorePosts}
            startingOffset={4}
            bigImage={true}
          />
        </main>

        <aside className="lg:w-1/3">
          <CategorySidebar pageName="categoryHome" />
        </aside>
      </div>

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
    </div>
  );
}
