import { gqlFetchAPI } from "./gql-fetch-api";

export async function getPostWithSlugAndDate(slug: string, date: string) {
  const query = `
    query PostBySlugAndDate($slug: String!, $date: String!) {
     post: postBySlugAndDate(slug: $slug, date: $date) {
        id
        databaseId
        title
        content
        excerpt
        slug
        uri
        date
        dateGmt
        author {
          node {
            name
            slug
            uri
          }
        }
        featuredImage {
          node {
            sourceUrl
            altText
            caption
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
      posts(first: 3, where: { orderby: { field: DATE, order: DESC } }) {
        edges {
          node {
            title
            excerpt
            slug
            uri
            date
            featuredImage {
              node {
                sourceUrl
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await gqlFetchAPI(query, {
      variables: {
        slug,
        date,
      },
    });

    // Ensure the post exists
    if (!data?.post) {
      return { post: null, posts: { edges: [] } };
    }

    // Filter out the current post from related posts
    if (data.posts?.edges) {
      data.posts.edges = data.posts.edges.filter(
        ({ node }: any) => node.slug !== slug
      );
    }

    return data;
  } catch (error) {
    console.error("Error fetching post:", error);
    return { post: null, posts: { edges: [] } };
  }
}
