import AdSlot from "@/components/common/AdSlot";
import NewsAuthor from "@/components/common/NewsAuthor";
import ShareButtons from "@/components/news-article/ShareButtons";
import FullDateDisplay from "@/components/common/display-date-formats/FullDateDisplay";
import CategorySidebar from "@/components/common/CategorySidebar";
import React, { lazy, ReactNode, Suspense } from "react";
import {
  FollowPlatformsSkeleton,
  NewsletterSkeleton,
  RelatedNewsSkeleton,
  TagsSkeleton,
} from "../skeletons/ArticleBodySkeleton";
import siteConfig from "@/constants/site-config";

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
  const fullUri = `${siteConfig.baseUrl}${post?.uri}`;
  return (
    <>
      {/* Top Desktop Ad */}
      {/* <section> */}
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
      {/* </section> */}

      <article itemScope itemType="https://schema.org/NewsArticle">
        <h1
          className="headline my-4 font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight"
          dangerouslySetInnerHTML={{ __html: safeTitle }}
        />
        <div className="overflow-x-hidden flex flex-col my-5 gap-10 lg:flex-row">
          <main className="lg:w-2/3">
            <header>
              <p
                className="sr-only"
                itemProp="headline"
                dangerouslySetInnerHTML={{ __html: safeTitle }}
              />
              <div
                className="flex justify-between items-center my-1"
                itemProp="datePublished"
              >
                <div>
                  {post.date && (
                    <span className="font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
                      <FullDateDisplay
                        dateString={post.date}
                        tooltipPosition="right"
                      />
                    </span>
                  )}
                  {post.author && (
                    <div className="text-lg">
                      <NewsAuthor author={post.author} />
                    </div>
                  )}
                </div>
                <div>
                  <ShareButtons
                    url={fullUri}
                    title={safeTitle}
                    mediaUrl={safeFeaturedImage || ""}
                    hashs={tagWithSlug}
                  />
                </div>
              </div>
              <div className="mb-6">
                <h2
                  className="excerpt text-xl my-3"
                  itemProp="description"
                  dangerouslySetInnerHTML={{ __html: safeExcerpt }}
                />
              </div>
            </header>

            <section itemProp="articleBody">{children}</section>

            <Suspense fallback={<FollowPlatformsSkeleton />}>
              <section className="mt-6 mb-16">
                <FollowPlatforms />
              </section>
            </Suspense>

            <Suspense fallback={<NewsletterSkeleton />}>
              <NewsletterForm />
            </Suspense>

            <section className="mb-8">
              <div className="overflow-hidden text-center">
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
            </section>
          </main>

          <aside className="lg:w-1/3 overflow-hidden mt-3  md:mt-24">
            <CategorySidebar
              pageName="article"
              adsTargetingParams={dfpTargetingParams}
            />
          </aside>
        </div>

        <footer className="mt-16 md:mt-6">
          <Suspense fallback={<TagsSkeleton />}>
            <TrendingNSubCategoriesList items={tagWithSlug} variant="tags" />
          </Suspense>

          <Suspense fallback={<RelatedNewsSkeleton />}>
            {relatedPosts && (
              <RelatedNews relatedPosts={relatedPosts} isBig={true} />
            )}
          </Suspense>

          <Suspense>
            <div className="overflow-hidden">
              <OutBrainWidget fullUrl={fullUri} />
            </div>
          </Suspense>
        </footer>
      </article>

      <Suspense>
        <JumpSlider title="More Stories">
          {moreStories && <MoreStories moreStories={moreStories} />}
        </JumpSlider>
      </Suspense>

      <section>
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

          {/* Not Working in both v3 and v4 */}
          {/* <div className="overflow-hidden text-center">
          <AdSlot
            targetingParams={dfpTargetingParams}
            id="div-gpt-ad-1691483572864-0"
            name="1x1_MG"
            sizes={[1, 1]}
            visibleOnDevices="onlyMobile"
          />
        </div> */}
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
      </section>
    </>
  );
};

export default ArticleLayout;
