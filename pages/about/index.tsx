import { GetStaticProps, NextPage } from "next";
import parse from "html-react-parser";
import Meta from "@/components/common/Meta";
import { getAboutPage } from "@/lib/gql-queries/get-about-page";
import AdSlot from "@/components/common/AdSlot";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";

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

const dfpTargetingParams = {
  section: ["about-us"],
  pos: "about",
  key: gerneralTargetingKeys,
};

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
        a: "text-blue-600 hover:underline disable",
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
      <Meta
        title="About Us"
        description="Learn more about our team, mission, and vision."
        canonical="about"
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
      {/* Pixel Ad */}
      <AdSlot
        id="div-gpt-ad-1661362827551-0"
        name="Pixel"
        targetingParams={dfpTargetingParams}
        sizes={[1, 1]}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />

      {/* OutOfPage Ad */}
      <AdSlot
        id="div-gpt-ad-1661362765847-0"
        name="OutOfPage"
        sizes={[1, 1]}
        outOfPage={true}
        targetingParams={dfpTargetingParams}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />
    </>
  );
};

export default AboutPage;
