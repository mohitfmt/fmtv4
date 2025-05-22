// lib/gql-queries/get-user.ts
import { gqlFetchAPI } from "./gql-fetch-api";
import { withLRUCache } from "@/lib/cache/withLRU";
import { LRUCache } from "lru-cache";

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

const authorCache = new LRUCache<string, any>({
  max: 200,
  ttl: 1000 * 60 * 5, // 5 minutes
  allowStale: false,
});

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

export const getAuthor = withLRUCache(
  generateAuthorCacheKey,
  rawGetAuthor,
  authorCache
);
