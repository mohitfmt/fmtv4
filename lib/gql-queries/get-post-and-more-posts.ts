import { gqlFetchAPI } from "./gql-fetch-api";
import { withLRUCache } from "@/lib/cache/withLRU";
import { LRUCache } from "lru-cache";

export const postPageCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 3, // 3 minutes
  allowStale: false,
  updateAgeOnGet: false,
});

async function rawGetPostAndMorePosts(
  slug: string,
  preview: boolean,
  previewData: any
) {
  const postPreview = preview && previewData?.post;
  const isId = Number.isInteger(Number(slug));
  const isSamePost = isId
    ? Number(slug) === postPreview?.id
    : slug === postPreview?.slug;

  const isDraft = isSamePost && postPreview?.status === "draft";
  const isRevision = isSamePost && postPreview?.status === "publish";

  const data = await gqlFetchAPI(
    `
      fragment AuthorFields on User {
        name
        slug
        uri
        avatar {
          url
        }
      }
      fragment PostFields on Post {
        id
        title
        excerpt
        slug
        date
        dateGmt
        modifiedGmt
        databaseId
        uri
        featuredImage {
          node {
            sourceUrl
            altText
            caption
            title
            mediaDetails {
              height
              width
            }
          }
        }
        author {
          node {
            ...AuthorFields
          }
        }
        categories {
          edges {
            node {
              name
              slug
            }
          }
        }
        tags {
          edges {
            node {
              name
              slug
            }
          }
        }
      }

      query PostBySlug($id: ID!, $idType: PostIdType!) {
        post(id: $id, idType: $idType) {
          ...PostFields
          content
          ${
            isRevision
              ? `
          revisions(first: 1, where: { orderby: { field: MODIFIED, order: DESC } }) {
            edges {
              node {
                title
                excerpt
                content
                author {
                  node {
                    ...AuthorFields
                  }
                }
              }
            }
          }
          `
              : ""
          }
        }

        posts(first: 3, where: { orderby: { field: DATE, order: DESC } }) {
          edges {
            node {
              ...PostFields
            }
          }
        }
      }
    `,
    {
      variables: {
        id: isDraft ? postPreview.id : slug,
        idType: isDraft ? "DATABASE_ID" : "SLUG",
      },
    }
  );

  if (isDraft) data.post.slug = postPreview.id;
  if (isRevision && data.post.revisions) {
    const revision = data.post.revisions.edges[0]?.node;
    if (revision) Object.assign(data.post, revision);
    delete data.post.revisions;
  }

  data.posts.edges = data.posts.edges.filter(
    ({ node }: any) => node.slug !== slug
  );
  if (data.posts.edges.length > 2) data.posts.edges.pop();

  return data;
}

export const getPostAndMorePosts = withLRUCache(
  (slug, preview, previewData) => `post:${slug}:${preview ? "p" : "np"}`,
  rawGetPostAndMorePosts,
  postPageCache
);
