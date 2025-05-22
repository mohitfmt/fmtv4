import { GetStaticProps } from "next";
import { PostCardProps } from "@/types/global";
import Meta from "@/components/common/Meta";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import AdSlot from "@/components/common/AdSlot";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";

interface Props {
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
  };
}

const dfpTargetingParams = {
  pos: "listing",
  section: ["photo gallery"],
  key: [
    "Photos",
    "Fmt-photos",
    "Gallery",
    "Fmt-Gallery",
    ...gerneralTargetingKeys,
  ],
};

const PhotosPage = ({ posts }: Props) => {
  const metadataConfig = {
    title: "Photo Gallery | Free Malaysia Today (FMT)",
    description:
      "Special feature of latest news photos and images selected by photographers and journalists from Free Malaysia Today (FMT).",
    canonical: "photos",
  };

  return (
    <>
      <Meta
        title={metadataConfig.title}
        description={metadataConfig.description}
        canonical={metadataConfig.canonical}
      />

      <div className="pt-2 pb-4">
        <PhotoGrid
          initialPosts={posts}
          adsTargetingParams={dfpTargetingParams}
        />
      </div>
      {/* Pixel Ad */}
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
      <AdSlot
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
      />
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  try {
    const variables = {
      first: 12,
      where: {
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["photos"],
            },
          ],
        },
      },
    };
    const response = await getFilteredCategoryPosts(variables);

    return {
      props: {
        posts: response.posts,
      },
      revalidate: 300,
    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return {
      props: {
        posts: { edges: [] },
      },
      revalidate: 110,
    };
  }
};

export default PhotosPage;
