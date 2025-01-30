import AdSlot from "@/components/common/AdSlot";
import NewsAuthor from "@/components/common/NewsAuthor";
import ShareButtons from "@/components/news-article/ShareButtons";
import FullDateDisplay from "@/components/common/display-date-formats/FullDateDisplay";
import CategorySidebar from "@/components/common/CategorySidebar";
import React, { lazy, ReactNode, Suspense } from "react";

const TrendingNSubCategoriesList = lazy(
  () => import("@/components/common/TrendingNSubCategoriesList")
);
const RelatedNews = lazy(() => import("./RelatedNews"));
const OutBrainWidget = lazy(() => import("./OutbrainWidget"));
const JumpSlider = lazy(() => import("./JumpSlider"));
const MoreStories = lazy(() => import("./MoreStories"));
const NewsletterForm = lazy(() => import("./NewsLetterForm"));
const FollowPlatforms = lazy(() => import("./FollowPlatForm"));

interface ArticleLayoutProps {
  post: any;
  safeTitle: string;
  safeExcerpt: string;
  safeUri: string;
  safeFeaturedImage?: string;
  tagWithSlug: any[];
  dfpTargetingParams: any;
  isGalleryPage?: boolean;
  children?: ReactNode;
  relatedPosts: any[];
  moreStories: any[];
}

const getImageCaption = (post: any): string => {
  if (post?.featuredImage?.node?.caption) {
    return post.featuredImage.node.caption;
  }

  const extractCaptionFromContent = (content: string): string | null => {
    if (!content) return null;
    const figcaptionMatch = content.match(
      /<figcaption[^>]*>(.*?)<\/figcaption>/
    );
    return figcaptionMatch ? figcaptionMatch[1].trim() : null;
  };

  const contentCaption = extractCaptionFromContent(post?.content);
  if (contentCaption) {
    return contentCaption;
  }

  return "Free Malaysia Today";
};

const ArticleLayout: React.FC<ArticleLayoutProps> = ({
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
  const fullUri = `https://www.freemalaysiatoday.com${post?.uri}`;

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

      {/* Top Mobile Ad */}
      <div className="ads-small-mobile">
        <AdSlot
          sizes={[
            [320, 50],
            [320, 100],
          ]}
          id="div-gpt-ad-1661362470988-0"
          name="ROS_Mobile_Leaderboard"
          visibleOnDevices="onlyMobile"
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

              <h2
                className="excerpt text-xl my-3"
                itemProp="description"
                dangerouslySetInnerHTML={{ __html: safeExcerpt }}
              />

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

            <div className="mb-8">
              <div className="overflow-hidden text-center min-h-[300px]">
                <AdSlot
                  targetingParams={dfpTargetingParams}
                  id="div-gpt-ad-1691483572864-0"
                  name="1x1_MG"
                  sizes={[1, 1]}
                  visibleOnDevices="both"
                />
              </div>

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
        <Suspense fallback={<div>Tags Loading...</div>}>
          <TrendingNSubCategoriesList items={tagWithSlug} variant="tags" />
        </Suspense>

        <Suspense fallback={<div>Related News Loading...</div>}>
          {relatedPosts && (
            <RelatedNews relatedPosts={relatedPosts} isBig={true} />
          )}
        </Suspense>

        <Suspense fallback={<div>You may like Loading...</div>}>
          <div className="overflow-hidden">
            <OutBrainWidget fullUrl={fullUri} />
          </div>
        </Suspense>
      </footer>

      <Suspense fallback={<div>More Stories Loading...</div>}>
        <JumpSlider title="More Stories">
          {moreStories && <MoreStories moreStories={moreStories} />}
        </JumpSlider>
      </Suspense>

      {/* Bottom Desktop Ad */}
      <div className="ads-small-desktop">
        <AdSlot
          sizes={[
            [728, 90],
            [970, 90],
          ]}
          id="div-gpt-ad-1661418008040-0"
          name="ROS_Multisize_Leaderboard_b"
          visibleOnDevices="onlyDesktop"
          targetingParams={dfpTargetingParams}
        />
      </div>

      {/* Mobile Bottom Ads */}
      <div className="my-8">
        <div className="ads-tall-mobile">
          <AdSlot
            id="div-gpt-ad-1661355926077-0"
            name="ROS_Halfpage"
            sizes={[300, 600]}
            visibleOnDevices="onlyMobile"
            targetingParams={dfpTargetingParams}
          />
        </div>

        {/* Not Working */}
        <div className="overflow-hidden text-center">
          <AdSlot
            targetingParams={dfpTargetingParams}
            id="div-gpt-ad-1691483572864-0"
            name="1x1_MG"
            sizes={[1, 1]}
            visibleOnDevices="onlyMobile"
          />
        </div>
      </div>

      {/* Our of Page Ad */}
      <AdSlot
        id="div-gpt-ad-1661362871446-0"
        name="1x1_Programmatic"
        sizes={[1, 1]}
        targetingParams={dfpTargetingParams}
        visibleOnDevices="onlyDesktop"
        outOfPage={true}
      />
    </>
  );
};

export default ArticleLayout;
