// lib/gql-queries/get-tag.ts
import { gqlFetchAPI } from "./gql-fetch-api";
import { withLRUCache } from "@/lib/cache/withLRU";
import { LRUCache } from "lru-cache";

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

// Cache instance: stores 100 tags, each for 1 hour
const tagCache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 60 * 60, // 1 hour
});

// Cached getTag function
export const getTag = withLRUCache(
  (slug: string) => `tag:${slug}`,
  (slug: string) =>
    gqlFetchAPI(GET_TAG, {
      variables: { tagId: slug, idType: "SLUG" },
    }),
  tagCache
);
