import { Metadata } from "next";
import parse from "html-react-parser";

export const metadata: Metadata = {
  title: "About Us | Free Malaysia Today (FMT)",
};

export const revalidate = 45;

// Custom parser options to add classes to specific elements
const parserOptions = {
  replace: (domNode: any) => {
    if (domNode.type === "tag") {
      // Style headings
      if (domNode.name === "h1") {
        domNode.attribs.class = "text-3xl font-bold mb-6 mt-8";
        return domNode;
      }

      if (domNode.name === "h2") {
        domNode.attribs.class = "text-2xl font-semibold mb-4 mt-6";
        return domNode;
      }
      if (domNode.name === "h3") {
        domNode.attribs.class = "text-xl font-medium mb-3 mt-4";
        return domNode;
      }

      // Style paragraphs
      if (domNode.name === "p") {
        domNode.attribs.class = "text-lg py-1.5";
        return domNode;
      }

      if (
        (domNode.name === "strong" || domNode.name === "b") &&
        domNode.parent?.name === "p"
      ) {
        domNode.attribs.class = "text-xl font-bold block mt-7 -mb-6";
        return domNode;
      }

      // Style lists
      if (domNode.name === "ul") {
        domNode.attribs.class = "list-disc pl-6 mb-4 space-y-2";
        return domNode;
      }
      if (domNode.name === "ol") {
        domNode.attribs.class = "list-decimal pl-6 mb-4 space-y-2";
        return domNode;
      }
      if (domNode.name === "li") {
        domNode.attribs.class = "mb-1";
        return domNode;
      }

      if (domNode.name === "hr") {
        domNode.attribs.class = "mt-4 bg-gray-200 border-1";
        return domNode;
      }

      // Style links
      if (domNode.name === "a") {
        domNode.attribs.class =
          "text-blue-600 hover:underline dark:text-blue-400";
        return domNode;
      }

      // Style sections or divs
      if (domNode.name === "section" || domNode.name === "div") {
        domNode.attribs.class = "mb-8";
        return domNode;
      }
    }
  },
};

const fetchPageData = async (pageId: string, idType: string) => {
  const response = await fetch(process.env.WORDPRESS_API_URL as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query Query($pageId: ID!, $idType: PageIdType) {
          page(id: $pageId, idType: $idType) {
            content
          }
        }
      `,
      variables: {
        pageId,
        idType,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  const json = await response.json();
  console.log("Fetched content:", json.data); // Debug log
  return json.data;
};

export const getStaticProps = async () => {
  try {
    const data = await fetchPageData("about", "URI");
    return {
      props: {
        content: data.page?.content || "",
      },
      revalidate,
    };
  } catch (error) {
    console.error("Error fetching page data:", error);
    return {
      notFound: true,
    };
  }
};

const Page = ({ content }: { content: string }) => {
  return (
    <article className="p-4">
      <h1 className="mt-4 py-2 text-center text-4xl font-extrabold mb-8">
        About Us
      </h1>
      <div>{parse(content, parserOptions)}</div>
    </article>
  );
};

export default Page;
