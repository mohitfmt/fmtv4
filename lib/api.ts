import { gqlFetchAPI } from "./gql-queries/gql-fetch-api";
import { GET_POST_BY_SLUG } from "./gql-queries/get-by-id";
import { getFilteredCategoryPosts } from "./gql-queries/get-filtered-category-posts";
import { DEFAULT_TAGS } from "@/constants/default-tags";
import { LRUCache } from "lru-cache";
import { withSmartLRUCache } from "./cache/withSmartLRU";
import { postDataCache } from "./cache/smart-cache-registry";

// Keep playlistCache as regular LRU since it's not article-based
export const playlistCache = new LRUCache<string, any>({
  max: 50,
  ttl: 1000 * 60 * 5,
  allowStale: false,
  updateAgeOnGet: false,
});
/**
 * Fetch full post data by slug, with LRU cache
 */
async function rawGetPostData(postId: string): Promise<{ post: any } | null> {
  try {
    const data = await gqlFetchAPI(GET_POST_BY_SLUG, {
      variables: {
        id: postId,
        idType: "SLUG",
      },
    });

    return data?.post ? { post: data.post } : null;
  } catch (error) {
    console.error("[getPostData] Error:", error);
    return null;
  }
}

// Use smart cache wrapper
export const getPostData = withSmartLRUCache(
  (postId: string) => `post:${postId}`,
  rawGetPostData,
  postDataCache
);

/**
 * Fetch related posts based on tags from the current post.
 */
export async function getRelatedPosts(postId: string) {
  const postData = await getPostData(postId);
  if (!postData?.post) return null;

  let tags = postData.post.tags?.edges?.map((tag: any) => tag.node.slug) || [];

  if (tags.length === 0) {
    tags = DEFAULT_TAGS.map((item) => item.name);
  }

  try {
    const data = await getFilteredCategoryPosts({
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
    });

    return data?.posts || null;
  } catch (error) {
    console.error("[getRelatedPosts] Error:", error);
    return null;
  }
}

/**
 * Fetch more stories from highlight category excluding the current post.
 */
export async function getMoreStories(postId: string) {
  const postData = await getPostData(postId);
  if (!postData?.post) return null;

  try {
    const data = await getFilteredCategoryPosts({
      first: 3,
      where: {
        notIn: [postData.post.databaseId],
        categoryName: "highlight",
      },
    });

    return data?.posts || null;
  } catch (error) {
    console.error("[getMoreStories] Error:", error);
    return null;
  }
}

/**
 * Fetch playlist JSON from static GCS file, with caching.
 */
export const getPlaylist = async (playlistId: string) => {
  const cacheKey = `playlist:${playlistId}`;
  if (playlistCache.has(cacheKey)) {
    return playlistCache.get(cacheKey);
  }

  try {
    const res = await fetch(
      `https://storage.googleapis.com/origin-s3feed.freemalaysiatoday.com/json/youtube-playlist/${playlistId}.json`
    );

    if (!res.ok) throw new Error("Failed to fetch playlist");

    const json = await res.json();
    playlistCache.set(cacheKey, json);
    return json;
  } catch (error) {
    console.error("[getPlaylist] Error:", error);
    return [];
  }
};
