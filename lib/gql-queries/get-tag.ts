// lib/gql-queries/get-tag.ts
import { tagCache } from "../cache/smart-cache-registry";
import { withSmartLRUCache } from "../cache/withSmartLRU";
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

// Cached getTag function
export const getTag = withSmartLRUCache(
  (slug: string) => `tag:${slug}`,
  (slug: string) =>
    gqlFetchAPI(GET_TAG, {
      variables: { tagId: slug, idType: "SLUG" },
    }),
  tagCache
);
