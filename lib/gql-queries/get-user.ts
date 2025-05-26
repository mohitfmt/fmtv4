// lib/gql-queries/get-user.ts
import { gqlFetchAPI } from "./gql-fetch-api";
import { withSmartLRUCache } from "../cache/withSmartLRU";
import { authorCache } from "../cache/smart-cache-registry";

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

function generateAuthorCacheKey(variables: { userId: string; idType: string }) {
  return `author:${variables.idType}:${variables.userId}`;
}

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

export const getAuthor = withSmartLRUCache(
  generateAuthorCacheKey,
  rawGetAuthor,
  authorCache
);
