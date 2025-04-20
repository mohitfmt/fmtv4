import { gqlFetchAPI } from "./gql-fetch-api";

export async function getCategoryNews(
  categoryName: string,
  limit: number,
  preview: boolean
) {
  try {
    const data = await gqlFetchAPI(
      `
        query categoryPost($categoryName: String, $limit: Int) {
          posts(first: $limit, 
            where: { 
              status: PUBLISH,
              taxQuery: {
                relation: AND,
                taxArray: [
                  {
                    field: SLUG,
                    operator: AND,
                    taxonomy: CATEGORY,
                    terms: [$categoryName],
                  },
                ],
              }, 
            }) {
            edges {
              node {
                title
                excerpt
                slug
                uri
                date
                dateGmt
                featuredImage {
                  node {
                    sourceUrl
                  }
                }
                categories {
                  edges {
                    node {
                      slug
                      name
                      id
                    }
                  }
                }
                author {
                  node {
                    slug
                    name
                    firstName
                    lastName
                    avatar {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      `,
      {
        variables: {
          categoryName,
          limit,
          preview,
        },
      }
    );

    return data?.posts?.edges.map((edge: any) => edge.node) || [];
  } catch (error) {
    console.error(`Error fetching posts for category ${categoryName}:`, error);
    return [];
  }
}
