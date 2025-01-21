// components/news-article/GalleryLayout.tsx
import AdSlot from "@/components/common/AdSlot";
import NewsAuthor from "@/components/common/NewsAuthor";
import ShareButtons from "@/components/news-article/ShareButtons";
import FullDateDisplay from "@/components/common/display-date-formats/FullDateDisplay";
import CategorySidebar from "@/components/common/CategorySidebar";
import React, { lazy, ReactNode, Suspense } from "react";

const TrendingNSubCategoriesList = lazy(
  () => import("@/components/common/TrendingNSubCategoriesList")
);
const RelatedNews = lazy(() => import("@/components/news-article/RelatedNews"));
const JumpSlider = lazy(() => import("@/components/news-article/JumpSlider"));
const MoreStories = lazy(() => import("@/components/news-article/MoreStories"));
const NewsletterForm = lazy(
  () => import("@/components/news-article/NewsLetterForm")
);
const FollowPlatforms = lazy(
  () => import("@/components/news-article/FollowPlatForm")
);

interface GalleryLayoutProps {
  post: any;
  safeTitle: string;
  safeExcerpt: string;
  safeUri: string;
  safeFeaturedImage?: string;
  tagWithSlug: any[];
  dfpTargetingParams: any;
  children?: ReactNode;
  relatedPosts: any[];
  moreStories: any[];
}

const GalleryLayout: React.FC<GalleryLayoutProps> = ({
  post,
  safeTitle,
  safeExcerpt,
  safeUri,
  safeFeaturedImage,
  tagWithSlug,
  dfpTargetingParams,
  relatedPosts,
  moreStories,
  children,
}) => {
  return (
    <>
      {/* Top Desktop Ad */}
      <div className="ads-dynamic-desktop">
        <AdSlot
          sizes={[
            [970, 90],
            [970, 250],
            [728, 90],
          ]}
          id="div-gpt-ad-1661333181124-0"
          name="ROS_Billboard"
          visibleOnDevices="onlyDesktop"
          targetingParams={dfpTargetingParams}
        />
      </div>

      <main className="overflow-x-hidden">
        <div className="flex flex-col my-5 gap-10 lg:flex-row">
          <article
            className="lg:w-2/3"
            itemScope
            itemType="https://schema.org/NewsArticle"
          >
            <header>
              <h1
                className="headline mb-4 w-[95vw] max-w-[1368px] font-heading text-3xl font-extrabold leading-tight md:w-[80vw] md:text-4xl lg:text-5xl"
                itemProp="headline"
                dangerouslySetInnerHTML={{ __html: safeTitle }}
              />

              <h2
                className="excerpt text-xl my-3"
                itemProp="description"
                dangerouslySetInnerHTML={{ __html: safeExcerpt }}
              />
              <div className="flex justify-between items-center my-1">
                <div>
                  {post.date && (
                    <span className="font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
                      <FullDateDisplay
                        dateString={post.date}
                        tooltipPosition="right"
                      />
                    </span>
                  )}
                  {post.author && <NewsAuthor author={post.author} />}
                </div>
                <div>
                  <ShareButtons
                    url={safeUri}
                    title={safeTitle}
                    mediaUrl={safeFeaturedImage || ""}
                    hashs={tagWithSlug}
                  />
                </div>
              </div>
            </header>

            <div itemProp="articleBody">{children}</div>

            <Suspense fallback={<div>Follow Us Loading...</div>}>
              <div className="mt-6 mb-16 ">
                <FollowPlatforms />
              </div>
            </Suspense>

            <Suspense fallback={<div>Newsletter Loading...</div>}>
              <NewsletterForm />
            </Suspense>

            <div className="my-8">
              <div className="ads-medium-mobile">
                <AdSlot
                  id="div-gpt-ad-1661355704641-0"
                  name="ROS_Midrec_b"
                  sizes={[300, 250]}
                  visibleOnDevices="onlyMobile"
                  targetingParams={dfpTargetingParams}
                />
              </div>
            </div>

            <Suspense fallback={<div>Tags Loading...</div>}>
              <TrendingNSubCategoriesList items={tagWithSlug} variant="tags" />
            </Suspense>
          </article>

          <aside className="lg:w-1/3 overflow-hidden mt-3  md:mt-24">
            <CategorySidebar
              pageName="article"
              adsTargetingParams={dfpTargetingParams}
            />
          </aside>
        </div>
      </main>

      <footer className="mb-5">
        <Suspense fallback={<div>Related News Loading...</div>}>
          {relatedPosts && (
            <RelatedNews relatedPosts={relatedPosts} isBig={true} />
          )}
        </Suspense>
      </footer>

      <Suspense fallback={<div>More Stories Loading...</div>}>
        <JumpSlider title="More Stories">
          {moreStories && <MoreStories moreStories={moreStories} />}
        </JumpSlider>
      </Suspense>
    </>
  );
};

export default GalleryLayout;
