import { gqlFetchAPI } from "./gql-fetch-api";

export async function getColumnists(ids: string[], preview: boolean) {
  const query = `
      query Author(
        $first: Int
        $where: RootQueryToUserConnectionWhereArgs
        $afterPost: String
        $wherePost: UserToPostConnectionWhereArgs
        $firstPost: Int
      ) {
        users(first: $first, where: $where) {
          edges {
            node {
              id
              name
              uri
              avatar {
                url
              }
              description
              posts(after: $afterPost, where: $wherePost, first: $firstPost) {
                nodes {
                  title
                  uri
                  dateGmt
                }
              }
            }
          }
        }
      }
    `;

  const variables = {
    first: ids?.length ?? 1,
    where: { include: ids?.length > 0 ? ids : [] },
    afterPost: "",
    wherePost: {
      status: "PUBLISH",
      taxQuery: {
        taxArray: [
          {
            terms: ["opinion"],
            operator: "AND",
            taxonomy: "CATEGORY",
            field: "SLUG",
          },
        ],
        relation: "AND",
      },
    },
    firstPost: 1,
    preview,
  };

  try {
    const data = await gqlFetchAPI(query, { variables });
    return data?.users?.edges.map((edge: any) => edge.node) || [];
  } catch (error) {
    console.error("Error fetching columnists:", error);
    return [];
  }
}
