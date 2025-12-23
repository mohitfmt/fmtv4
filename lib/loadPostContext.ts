import { getPostData } from "@/lib/api";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { DEFAULT_TAGS } from "@/constants/default-tags";

export async function loadPostContext(postId: string) {
  const postDataResult = await getPostData(postId);

  if (!postDataResult?.post) {
    return {
      post: null,
      relatedPosts: [],
      moreStories: [],
    };
  }

  const { post } = postDataResult;

  const tags = post.tags?.edges?.map((tag: any) => tag.node.slug) || [];
  const tagList = tags.length > 0 ? tags : DEFAULT_TAGS.map((t) => t.name);

  const relatedPostsPromise = await getFilteredCategoryPosts({
    first: 6,
    where: {
      status: "PUBLISH",
      taxQuery: {
        taxArray: [
          {
            taxonomy: "TAG",
            operator: "IN",
            terms: tagList,
            field: "SLUG",
          },
        ],
        relation: "AND",
      },
      notIn: [post.databaseId],
    },
  });

  const moreStoriesPromise = await getFilteredCategoryPosts({
    first: 3,
    where: {
      categoryName: "highlight",
      status: "PUBLISH",
      notIn: [post.databaseId],
    },
  });

  // Defer actual resolution: background load or suspense or async UI
  const [relatedData, moreData] = await Promise.allSettled([
    relatedPostsPromise,
    moreStoriesPromise,
  ]);

  return {
    post,
    relatedPosts:
      relatedData.status === "fulfilled"
        ? (relatedData.value?.posts?.edges ?? [])
        : [],
    moreStories:
      moreData.status === "fulfilled"
        ? (moreData.value?.posts?.edges ?? [])
        : [],
  };
}
