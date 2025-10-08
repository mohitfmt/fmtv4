import { gqlFetchAPI } from "./gql-fetch-api";

export const GET_TAG = `
  query GetTag($tagId: ID!, $idType: TagIdType) {
    tag(id: $tagId, idType: $idType) {
      databaseId
      id
      name
      slug
      uri
      count
      description
    }
  }
`;

// Direct function without cache
export const getTag = async (slug: string) => {
  return gqlFetchAPI(GET_TAG, {
    variables: { tagId: slug, idType: "SLUG" },
  });
};
