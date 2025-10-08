// lib/gql-queries/get-user.ts
import { gqlFetchAPI } from "./gql-fetch-api";

export const GET_AUTHOR = `
  query GetUser($userId: ID!, $idType: UserNodeIdTypeEnum) {
    user(id: $userId, idType: $idType) {
      id
      databaseId
      avatar {
        url
      }
      databaseId
      description
      slug
      name
      nicename
    }
  }
`;

async function rawGetAuthor(variables: {
  userId: string;
  idType: string;
}): Promise<{ user: any }> {
  try {
    const data = await gqlFetchAPI(GET_AUTHOR, { variables });
    return data && data.user ? data : { user: null };
  } catch (error) {
    console.error("[getAuthor] Error:", error);
    return { user: null };
  }
}

export const getAuthor = rawGetAuthor;
