import { gqlFetchAPI } from "./gql-fetch-api";

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

export const getAboutPage = rawGetAboutPage;
