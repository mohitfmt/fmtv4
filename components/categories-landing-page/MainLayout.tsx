// components/layouts/MainLayout.tsx
import { useRouter } from "next/router";
import CategorySidebar from "./CategorySidebar";
import AdSlot from "@/components/common/AdSlot";
import { categoriesNavigation } from "@/constants/categories-navigation";
import TrendingNSubCategoriesList from "../common/TrendingNSubCategoriesList";

interface MainLayoutProps {
  children: React.ReactNode;
}

const dfpTargetingParams = {
  pos: "listing",
  section: ["category-landing-pages"],
};

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const mainPath = router.pathname.split("/")[1];

  // Convert URL path to categoriesNavigation path format
  const categoryPath = `home-${mainPath}`;

  // Find the current category page directly
  const currentPage = categoriesNavigation.find(
    (page) => page.path === categoryPath
  );

  const subcategories = currentPage?.subCategories || [];
  const hasSubcategories = subcategories.length > 0;

  return (
    <div>
      {/* Top Desktop Ad */}
      <div className="mb-4 hidden justify-center md:flex">
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
      <div className="mb-4 flex justify-center md:hidden">
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

      {/* SubCategories */}
      {hasSubcategories && (
        <TrendingNSubCategoriesList
          items={subcategories.map((cat) => ({
            id: cat.slug,
            title: cat.title,
            href: cat.href,
          }))}
          variant="subcategories"
        />
      )}

      {/* Main Content Layout */}
      <div className="flex flex-col gap-10 lg:flex-row">
        <main className="lg:w-2/3">{children}</main>
        <aside className="lg:w-1/3">
          <CategorySidebar />
        </aside>
      </div>

      {/* Bottom Desktop Ad */}
      <div className="mb-4 hidden justify-center md:flex">
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
