import { GetStaticProps, NextPage } from "next";
import parse from "html-react-parser";
import Meta from "@/components/common/Meta";
import { getAboutPage } from "@/lib/gql-queries/get-about-page";
import { NextSeo } from "next-seo";
import siteConfig from "@/constants/site-config";
interface PageData {
  dateGmt: string;
  databaseId: number;
  id: string;
  slug: string;
  uri: string;
  content: string;
}

interface PageProps {
  pageData: PageData | null;
  error?: boolean;
}

const PARSER_OPTIONS = {
  replace: (domNode: any) => {
    if (domNode.type === "tag") {
      const classMap: Record<string, string> = {
        h1: "text-3xl font-bold mb-6 mt-8",
        h2: "text-2xl font-semibold mb-4 mt-6",
        h3: "text-xl font-medium mb-3 mt-4",
        p: "text-lg py-1.5",
        ul: "list-disc pl-6 mb-4 space-y-2",
        ol: "list-decimal pl-6 mb-4 space-y-2",
        li: "mb-1",
        hr: "mt-4 bg-gray-200 border-1",
        a: "text-blue-600 hover:underline dark:text-blue-400 disable",
        section: "mb-8",
        div: "mb-8",
      };

      if (domNode.name in classMap) {
        domNode.attribs = domNode.attribs || {};
        domNode.attribs.class = classMap[domNode.name];
        return domNode;
      }

      if (
        (domNode.name === "strong" || domNode.name === "b") &&
        domNode.parent?.name === "p"
      ) {
        domNode.attribs = domNode.attribs || {};
        domNode.attribs.class = "text-xl font-bold block mt-7 -mb-6";
        return domNode;
      }
    }
  },
};

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  try {
    const pageData = await getAboutPage();

    if (!pageData) {
      return { notFound: true };
    }

    return {
      props: { pageData },
      revalidate: 30 * 24 * 60 * 60, // 30 days
    };
  } catch (error) {
    console.error("Failed to fetch about page:", error);
    return {
      props: {
        pageData: null,
        error: true,
      },
    };
  }
};

const AboutPage: NextPage<PageProps> = ({ pageData, error }) => {
  if (error || !pageData) {
    return (
      <>
        <Meta
          title="Error | Free Malaysia Today (FMT)"
          description="Unable to load content"
        />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Unable to load content</h1>
            <p className="text-gray-600">Please try again later</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NextSeo
        title="About Us"
        description="Learn more about our team, mission, and vision."
        canonical="https://www.mywebsite.com/about"
        openGraph={{
          url: "https://www.mywebsite.com/about",
          title: "About Us",
          description: "Learn more about our team, mission, and vision.",
          images: [
            {
              url:
                siteConfig.iconPath ||
                "https://www.google.com/imgres?q=free%20malaysia%20today&imgurl=https%3A%2F%2Flookaside.fbsbx.com%2Flookaside%2Fcrawler%2Fmedia%2F%3Fmedia_id%3D100063570188784&imgrefurl=https%3A%2F%2Fwww.facebook.com%2Ffmtlifestyle%2F&docid=XEk7rDIub7c7fM&tbnid=hJj_K2aSFTUJFM&vet=12ahUKEwj3_t-v7KmMAxWs_DgGHU0FC5QQM3oECDgQAA..i&w=500&h=500&hcb=2&ved=2ahUKEwj3_t-v7KmMAxWs_DgGHU0FC5QQM3oECDgQAA",
              width: 1200,
              height: 630,
              alt: "Team working together",
            },
          ],
          siteName: "My Website",
        }}
        twitter={{
          handle: "@myhandle",
          site: "@mywebsite",
          cardType: "summary_large_image",
        }}
      />

      <div className="py-4">
        <article>
          <h1 className="mt-4 py-2 text-center text-4xl font-extrabold mb-8">
            About Us
          </h1>

          <div className="prose prose-lg max-w-none">
            {parse(pageData.content, PARSER_OPTIONS)}
          </div>
        </article>
      </div>
    </>
  );
};

export default AboutPage;
