// components/layouts/MainLayout.tsx
import { useRouter } from "next/router";
import CategorySidebar from "../common/CategorySidebar";
import AdSlot from "@/components/common/AdSlot";
import { categoriesNavigation } from "@/constants/categories-navigation";
import TrendingNSubCategoriesList from "../common/TrendingNSubCategoriesList";
import { AdsTargetingParams } from "@/types/global";
import { GeneralTargetingParams } from "@/constants/ads-targeting-params/general";

interface MainLayoutProps {
  children: React.ReactNode;
  adsTargetingParams?: AdsTargetingParams;
  isCategoryPage?: boolean;
}

export default function MainLayout({
  children,
  adsTargetingParams,
  isCategoryPage = false,
}: MainLayoutProps) {
  const router = useRouter();

  const dfpTargetingParams =
    adsTargetingParams ||
    GeneralTargetingParams({
      section: [
        isCategoryPage ? "category-landing-page" : "subcategory-landing-page",
        "landing-page",
      ],
    });

  // Only compute these if it's a category page
  const mainPath = isCategoryPage ? router.pathname.split("/")[1] : "";
  const currentPage = isCategoryPage
    ? categoriesNavigation.find((page) => page.path.includes(mainPath))
    : null;
  const subcategories = currentPage?.subCategories || [];
  const hasSubcategories = subcategories.length > 0;

  return (
    <div>
      {/* SubCategories - Only show if it's a category page and has subcategories */}
      {isCategoryPage && hasSubcategories && (
        <TrendingNSubCategoriesList
          items={subcategories.map((cat) => ({
            id: cat.slug,
            title: cat.title,
            href: cat.href,
          }))}
          variant="subcategories"
        />
      )}
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

      {/* Main Content Layout */}
      <div className="flex flex-col my-5 gap-10 lg:flex-row">
        <main className="lg:w-2/3">{children}</main>
        <aside className="lg:w-1/3">
          <CategorySidebar
            pageName="categoryHome"
            adsTargetingParams={dfpTargetingParams}
          />
        </aside>
      </div>

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
    </div>
  );
}
