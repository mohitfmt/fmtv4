import { DEFAULT_TAGS } from "@/constants/default-tags";
import { GET_FILTERED_CATEGORY } from "./gql-queries/get-filtered-category";
import { gqlFetchAPI } from "./gql-queries/gql-fetch-api";
import { GET_POST_BY_SLUG } from "./gql-queries/get-by-id";

export async function getPostData(postId: string) {
  try {
    const data = await gqlFetchAPI(GET_POST_BY_SLUG, {
      variables: {
        id: postId,
        idType: "SLUG",
      },
    });

    return data?.post ? { post: data.post } : null;
  } catch (error) {
    console.error("Error fetching post data:", error);
    return null;
  }
}

export async function getRelatedPosts(postId: string) {
  const postData = await getPostData(postId);
  if (!postData?.post) {
    return null;
  }

  let tags = postData.post.tags?.edges?.map((tag: any) => tag.node.slug) || [];

  if (tags.length === 0) {
    tags = DEFAULT_TAGS.map((item) => item.name);
  }

  try {
    const data = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 6,
        where: {
          notIn: [postData.post.databaseId],
          taxQuery: {
            taxArray: [
              {
                taxonomy: "TAG",
                operator: "IN",
                terms: tags,
                field: "SLUG",
              },
            ],
            relation: "AND",
          },
        },
      },
    });

    return data?.posts || null;
  } catch (error) {
    console.error("Error fetching related posts:", error);
    return null;
  }
}

export async function getMoreStories(postId: string) {
  const postData = await getPostData(postId);
  if (!postData?.post) {
    return null;
  }

  try {
    const data = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 3,
        where: {
          notIn: [postData.post.databaseId],
          categoryName: "highlight",
        },
      },
    });

    return data?.posts || null;
  } catch (error) {
    console.error("Error fetching more stories:", error);
    return null;
  }
}

export const getPlaylist = async (playlistId: string) => {
  try {
    const res = await fetch(
      `https://storage.googleapis.com/origin-s3feed.freemalaysiatoday.com/json/youtube-playlist/${playlistId}.json`,
      {
        next: { revalidate: 360 }, // Optional: cache for 1 hour
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch playlist");
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching playlist:", error);
    return [];
  }
};
