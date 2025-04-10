import { PostCardProps } from "@/types/global";
import CategorySidebar from "../common/CategorySidebar";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import AuthorPostsWithLoadMore from "./AuthorWithLoadMore";
import Image from "next/image";
import { Suspense } from "react";

interface Author {
  name: string;
  description: string;
  slug: string;
  databaseId: number;
  avatar: {
    url: string;
  };
}

interface Posts {
  edges: Array<{
    node: PostCardProps;
  }>;
  pageInfo: {
    endCursor: string;
  };
}

interface AuthorLayoutProps {
  author: Author;
  posts: Posts;
}

export default function AuthorLayout({ author, posts }: AuthorLayoutProps) {
  // Take first 4 posts for the top grid
  const topPosts = posts.edges.slice(0, 4);

  // Prepare initial posts for load more (remaining posts)
  const initialLoadMorePosts = {
    ...posts,
    edges: posts.edges.slice(4),
  };

  const hasDescription = Boolean(author.description);
  const hasTopPosts = topPosts.length > 0;

  return (
    <>
      <div className="py-4" role="main">
        <div className="flex flex-col my-5 gap-10 lg:flex-row">
          <main
            id="main-content"
            className="lg:w-2/3"
            aria-labelledby="author-details"
          >
            {/* Author Header */}
            <header
              className="flex items-center gap-4"
              aria-label="author-information"
            >
              <div
                className="relative flex h-40 w-40 items-center justify-center rounded-full border border-yellow-500 p-3"
                aria-hidden="true"
              >
                <Image
                  alt="author-avatar"
                  src={author.avatar?.url}
                  width={200}
                  height={200}
                  className="rounded-full object-cover"
                  priority
                  quality={90}
                />
              </div>
              <div className="flex flex-col gap-2">
                <h1 id="author-name" className="text-4xl font-medium">
                  {author?.name}
                </h1>
                {hasDescription && (
                  <p
                    className="max-w-prose"
                    aria-label={`about-${author.name}`}
                  >
                    {author.description}
                  </p>
                )}
              </div>
            </header>

            {/* Top Posts Grid */}
            {hasTopPosts && (
              <section aria-labelledby="recent-posts-heading" className="mt-8">
                <div
                  className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4"
                  role="list"
                >
                  <Suspense fallback={<div>Loading recent posts...</div>}>
                    {topPosts.map(({ node }) => (
                      <div key={`${author.name}-${node.id}`} role="listitem">
                        <TTBNewsPreview {...node} />
                      </div>
                    ))}
                  </Suspense>
                </div>
              </section>
            )}

            {/* Additional Author Posts with Load More */}
            <section aria-labelledby="more-posts-heading" className="mt-8">
              <Suspense fallback={<div>Loading more posts...</div>}>
                <AuthorPostsWithLoadMore
                  authorId={author.databaseId.toString()}
                  initialPosts={initialLoadMorePosts}
                  startingOffset={4}
                  bigImage={true}
                />
              </Suspense>
            </section>
          </main>

          <aside className="lg:w-1/3" aria-label="Sidebar categories">
            <Suspense fallback={<div>Loading sidebar...</div>}>
              <CategorySidebar pageName="categoryHome" />
            </Suspense>
          </aside>
        </div>
      </div>
    </>
  );
}
