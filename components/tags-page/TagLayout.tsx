import { PostCardProps } from "@/types/global";
import CategorySidebar from "../common/CategorySidebar";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import SectionHeading from "../common/SectionHeading";
import TagPostsWithLoadMore from "./TagsWithLoadMores";

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

  return (
    <div className="container p-4">
      <div className="flex flex-col my-5 gap-10 lg:flex-row">
        <main className="lg:w-2/3">
          <SectionHeading sectionName={title} />

          {/* Top Posts Grid */}
          <div
            key={`horizontal-${title}`}
            className="w-full grid grid-cols-2 gap-4 sm:mt-4 md:grid-cols-4"
          >
            {topPosts.map(({ node }) => (
              <TTBNewsPreview {...node} key={`${title}-${node.id}`} />
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
    </div>
  );
}
