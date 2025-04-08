import HorizontalLoadMore from "./HorizontalLoadMore";
import MainLayout from "./MainLayout";
import { PostCardProps } from "@/types/global";
import { categoriesNavigation } from "@/constants/categories-navigation";
import CategoryHeroPost from "../common/news-preview-cards/CategoryHeroPost";
import AdSlot from "../common/AdSlot";
import SectionHeading from "../common/SectionHeading";
import CategoryWithLoadMore from "./SubCategoryWithLoadMore";
import { useVisibilityRefresh } from "@/hooks/useVisibilityRefresh";

interface PostsData {
  edges: Array<{
    node: PostCardProps;
  }>;
}

interface SubCategoryPost {
  slug: string;
  posts: PostsData;
  bigImage: boolean;
}

interface CategoryPostsLayoutProps {
  title: string;
  posts: PostsData;
  currentPage: (typeof categoriesNavigation)[0] | undefined;
  AdsTargetingParams: {
    pos: string;
    section: string[];
    key: string[];
  };
  subCategoryPosts: SubCategoryPost[];
  categoryName: string;
}

export const CategoryPostsLayout = ({
  title,
  posts,
  currentPage,
  AdsTargetingParams,
  subCategoryPosts,
  categoryName,
}: CategoryPostsLayoutProps) => {
  // Use the visibility refresh hook
  useVisibilityRefresh();

  if (!posts || !currentPage) return null;

  // Get the first post for hero section
  const heroPost = posts.edges[0];

  // Get remaining posts for HorizontalLoadMore
  const remainingPosts = {
    edges: posts.edges.slice(1), // Get all posts except the first one
  };

  return (
    <MainLayout adsTargetingParams={AdsTargetingParams} isCategoryPage={true}>
      <SectionHeading sectionName={title} />

      {/* Featured Posts Section */}
      <section className="mt-4">
        {heroPost && (
          <CategoryHeroPost
            key={heroPost.node.id}
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
      <HorizontalLoadMore posts={remainingPosts} categoryName={categoryName} />

      {/* Category Sections */}
      {currentPage?.subCategories?.map((category, index) => {
        const categoryPosts = subCategoryPosts.find(
          (p) => p.slug === category.slug
        );

        // Skip rendering if no posts found for category
        if (!categoryPosts?.posts) return null;

        return (
          <div key={category?.title ?? "CategoryTitle" + index}>
            {/* Mobile Ads */}
            {index === 0 && (
              <div className="ads-medium-mobile">
                <AdSlot
                  id="div-gpt-ad-1661355704641-0"
                  name="ROS_Midrec_b"
                  sizes={[300, 250]}
                  visibleOnDevices="onlyMobile"
                  targetingParams={AdsTargetingParams}
                />
              </div>
            )}
            {index === 1 && (
              <div className="ads-tall-mobile">
                <AdSlot
                  id="div-gpt-ad-1661355926077-0"
                  name="ROS_Halfpage"
                  sizes={[300, 600]}
                  visibleOnDevices="onlyMobile"
                  targetingParams={AdsTargetingParams}
                />
              </div>
            )}

            {categoryPosts && (
              <CategoryWithLoadMore
                posts={categoryPosts.posts}
                href={category?.href}
                path={currentPage.path}
                slug={category?.slug}
                title={category?.title}
                bigImage={true}
              />
            )}
          </div>
        );
      })}
    </MainLayout>
  );
};
