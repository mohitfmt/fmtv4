import { GetStaticProps } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { PostCardProps } from "@/types/global";
import Meta from "@/components/common/Meta";
import PhotoGrid from "@/components/gallery/PhotoGrid";

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
  key: [],
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
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  try {
    const response = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
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
      },
    });

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
      revalidate: 60,
    };
  }
};

export default PhotosPage;
