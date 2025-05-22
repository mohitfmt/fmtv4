import { gqlFetchAPI } from "./gql-fetch-api";
import { withLRUCache } from "@/lib/cache/withLRU";
import { LRUCache } from "lru-cache";

// 🔑 Named export so it can be cleared manually
export const aboutPageCache = new LRUCache<string, any>({
  max: 10,
  ttl: 1000 * 60 * 10, // 10 minutes
  allowStale: false,
  updateAgeOnGet: false,
});

async function rawGetAboutPage() {
  const query = `
    query GetPage {
      page(id: "about", idType: URI) {
        dateGmt
        databaseId
        id
        slug
        uri
        content
      }
    }
  `;

  try {
    const data = await gqlFetchAPI(query);
    return data?.page || null;
  } catch (error) {
    console.error("Error fetching about page:", error);
    return null;
  }
}

export const getAboutPage = withLRUCache(
  () => "page:about",
  rawGetAboutPage,
  aboutPageCache
);
