// pages/about/index.tsx

import { GetStaticProps, NextPage } from "next";
import parse from "html-react-parser";
import Head from "next/head";
import { useState } from "react";
import Meta from "@/components/common/Meta";
import { getAboutPage } from "@/lib/gql-queries/get-about-page";
import AdSlot from "@/components/common/AdSlot";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";
import siteConfig from "@/constants/site-config";
import { generateAboutPageJsonLD } from "@/constants/jsonlds/about-page-json-ld";
import { defaultAlternateLocale } from "@/constants/alternate-locales";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

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
        h1: "text-4xl font-extrabold mb-6 mt-8 dark:text-white",
        h2: "text-3xl font-bold mb-4 mt-8 border-b-2 border-blue-600 dark:border-blue-400 pb-2 dark:text-white",
        h3: "text-2xl font-semibold mb-3 mt-6 dark:text-gray-100",
        p: "text-lg py-2 leading-relaxed dark:text-gray-300",
        ul: "list-disc pl-6 mb-4 space-y-2 dark:text-gray-300",
        ol: "list-decimal pl-6 mb-4 space-y-2 dark:text-gray-300",
        li: "mb-2 text-lg dark:text-gray-300",
        hr: "mt-8 mb-8 border-t-2 border-gray-300 dark:border-gray-700",
        a: "text-blue-600 dark:text-blue-400 hover:underline font-medium",
        section: "mb-10",
        div: "mb-8",
        blockquote:
          "border-l-4 border-blue-600 dark:border-blue-400 pl-4 italic my-4 text-gray-700 dark:text-gray-400",
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
        domNode.attribs.class =
          "text-xl font-bold block mt-7 -mb-4 dark:text-white";
        return domNode;
      }
    }
  },
};

// FAQ Accordion Component
const FAQAccordion = ({
  faq,
  index,
}: {
  faq: { question: string; answer: string };
  index: number;
}) => {
  const [isOpen, setIsOpen] = useState(index === 0); // First FAQ open by default

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-semibold text-left text-gray-900 dark:text-white pr-4">
          {faq.question}
        </h3>
        {isOpen ? (
          <FiChevronUp className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        ) : (
          <FiChevronDown className="w-5 h-5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div
            className="text-gray-700 dark:text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: faq.answer }}
          />
        </div>
      )}
    </div>
  );
};

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  try {
    const pageData = await getAboutPage();

    if (!pageData) {
      return { notFound: true };
    }

    return {
      props: { pageData },
      revalidate: 7 * 24 * 60 * 60, // 7 days
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
        <div className="flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4 dark:text-white">
              Unable to load content
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please try again later
            </p>
          </div>
        </div>
      </>
    );
  }

  const aboutPageJsonLD = generateAboutPageJsonLD();
  const fullUrl = `${siteConfig.baseUrl}/about`;

  // FAQ Data - All 12 questions
  const faqs = [
    {
      question: "What is Free Malaysia Today?",
      answer:
        "Free Malaysia Today (FMT) is Malaysia's leading independent online news portal, providing comprehensive coverage of politics, business, lifestyle, and sports since 2009. We serve over 22 million annual users and 2.3 million monthly active users with accurate, unbiased bilingual reporting in English and Bahasa Malaysia.",
    },
    {
      question: "Is Free Malaysia Today a print newspaper?",
      answer:
        "No, Free Malaysia Today is a digital-only news organization. We focus exclusively on online journalism to provide fast, accessible, and comprehensive news coverage to readers across Malaysia and internationally through our website, mobile apps, and social media platforms.",
    },
    {
      question: "What is FMT's editorial stance and political position?",
      answer:
        "FMT maintains strict editorial independence and political neutrality. We practice objective journalism by reporting facts as they are, quoting sources accurately without editorial opinion or bias. We believe readers should make their own judgments based on raw, unfiltered information. Our mission is to deliver news with objectivity – the missing dimension in today's news scene.",
    },
    {
      question: "How can I contact FMT's editorial team?",
      answer:
        'For editorial queries and news tips, email <a href="mailto:editor@freemalaysiatoday.com" class="text-blue-600 dark:text-blue-400 hover:underline">editor@freemalaysiatoday.com</a>. For letters to the editor and public submissions, email <a href="mailto:letters@freemalaysiatoday.com" class="text-blue-600 dark:text-blue-400 hover:underline">letters@freemalaysiatoday.com</a>. For general inquiries, contact <a href="mailto:admin@freemalaysiatoday.com" class="text-blue-600 dark:text-blue-400 hover:underline">admin@freemalaysiatoday.com</a> or call +603 7887 2888.',
    },
    {
      question: "What languages does FMT publish in?",
      answer:
        "FMT publishes news in both English and Bahasa Malaysia, ensuring comprehensive bilingual coverage for all Malaysians. We have dedicated editorial teams for each language, with specialized sections including English Desk, BM Desk, and Lifestyle content in both languages.",
    },
    {
      question: "How can I advertise with FMT?",
      answer:
        'For advertising rates, media kits, and partnership opportunities, please contact our advertising team at <a href="mailto:advertise@freemalaysiatoday.com" class="text-blue-600 dark:text-blue-400 hover:underline">advertise@freemalaysiatoday.com</a>. We offer various digital advertising solutions including display ads, sponsored content, native advertising, and video advertising across our platforms reaching 22M+ annual users.',
    },
    {
      question: "How do I submit a news tip or story to FMT?",
      answer:
        'We welcome news tips and story ideas from the public. Email your tips to <a href="mailto:editor@freemalaysiatoday.com" class="text-blue-600 dark:text-blue-400 hover:underline">editor@freemalaysiatoday.com</a>. For letters to the editor or opinion submissions, email <a href="mailto:letters@freemalaysiatoday.com" class="text-blue-600 dark:text-blue-400 hover:underline">letters@freemalaysiatoday.com</a>. All submissions will be reviewed by our editorial team.',
    },
    {
      question: "How can I work at Free Malaysia Today?",
      answer:
        'We\'re always looking for talented journalists, editors, videographers, and digital media professionals. Send your CV and cover letter to <a href="mailto:career@freemalaysiatoday.com" class="text-blue-600 dark:text-blue-400 hover:underline">career@freemalaysiatoday.com</a>. Visit our careers page for current openings and learn about life at FMT\'s newsroom in Petaling Jaya.',
    },
    {
      question: "Where is FMT headquartered?",
      answer:
        "FMT's headquarters and newsroom are located at The West Wing, Menara Axis, Ground Floor, Quattro West, 4, Persiaran Barat, Petaling Jaya, Selangor 46200, Malaysia. We also operate a Northern Bureau for regional coverage.",
    },
    {
      question: "What content partnerships does FMT have?",
      answer:
        "FMT partners with leading international and regional news agencies including Agence France-Presse (AFP), Reuters, Bernama (Malaysian National News Agency), and EXT Daily. These partnerships enable us to provide comprehensive local and international news coverage to our readers.",
    },
    {
      question: "How does FMT ensure journalistic integrity and accuracy?",
      answer:
        "FMT maintains strict editorial standards including fact-checking protocols, transparent corrections policy, and editorial independence from commercial interests. Our newsroom has dedicated Copy Editors, Chief News Editors, and Executive Editors who ensure accuracy and fairness in all our reporting. We are committed to staying true to objectivity – the missing dimension in today's news scene.",
    },
  ];

  return (
    <>
      <Head>
        {/* Basic Meta Tags */}
        <title>About FMT (Free Malaysia Today) - Mission, Team & History</title>
        <meta
          name="description"
          content="Free Malaysia Today (FMT) is Malaysia's leading independent news organization since 2009. Serving 22M+ annual users with bilingual news coverage. Meet our editorial team and learn our commitment to objective journalism."
        />

        {/* Keywords */}
        <meta
          name="keywords"
          content="Free Malaysia Today, FMT, about FMT, Malaysian journalism, independent news Malaysia, FMT editorial team, journalism ethics Malaysia, FMT history, digital news Malaysia, bilingual news, objective journalism, Malaysian media, news organization Malaysia, FMT mission, FMT contact"
        />

        {/* Enhanced Open Graph Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={fullUrl} />
        <meta
          property="og:title"
          content="About FMT (Free Malaysia Today) - Malaysia's Independent News Organization"
        />
        <meta
          property="og:description"
          content="Since 2009, FMT (Free Malaysia Today) has been Malaysia's trusted source for independent journalism. 700K+ articles, 22M+ annual users, bilingual coverage. Meet our team and learn about our commitment to objective reporting."
        />
        <meta
          property="og:image"
          content={`${siteConfig.baseUrl}/PreviewLinkImage.png`}
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="Free Malaysia Today - About Us"
        />
        <meta property="og:site_name" content="Free Malaysia Today" />
        <meta property="og:locale" content="en_MY" />
        {defaultAlternateLocale?.map((locale: string) => (
          <meta key={locale} property="og:locale:alternate" content={locale} />
        ))}

        {/* Article Meta Tags */}
        <meta
          property="article:publisher"
          content="https://www.facebook.com/freemalaysiatoday"
        />
        <meta property="article:section" content="About" />
        <meta
          property="article:modified_time"
          content={new Date().toISOString()}
        />
        <meta property="article:author" content="Free Malaysia Today" />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta
          name="twitter:title"
          content="About FMT - Malaysia's Independent News Organization"
        />
        <meta
          name="twitter:description"
          content="Since 2009, serving 22M+ annual users with independent Malaysian journalism in English & Bahasa Malaysia. Meet our team."
        />
        <meta
          name="twitter:image"
          content={`${siteConfig.baseUrl}/PreviewLinkImage.png`}
        />
        <meta name="twitter:image:alt" content="Free Malaysia Today" />
        <meta name="twitter:creator" content="@fmtoday" />

        {/* Geographic Tags */}
        <meta name="geo.region" content="MY-10" />
        <meta
          name="geo.placename"
          content="Petaling Jaya, Selangor, Malaysia"
        />
        <meta
          name="geo.position"
          content="3.1037209336764953;101.64165328465576"
        />
        <meta name="ICBM" content="3.1037209336764953, 101.64165328465576" />

        {/* Language & Content Tags */}
        <meta name="content-language" content="en-MY" />
        <link rel="alternate" hrefLang="en-my" href={fullUrl} />
        <link rel="alternate" hrefLang="x-default" href={fullUrl} />

        {/* Canonical URL */}
        <link rel="canonical" href={fullUrl} />

        {/* Enhanced Robots Meta */}
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta
          name="googlebot"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />

        {/* Author & Publisher */}
        <meta name="author" content="Free Malaysia Today" />
        <meta name="publisher" content="FMT Media Sdn Bhd" />
        <meta
          name="copyright"
          content={`© ${new Date().getFullYear()} FMT Media Sdn Bhd`}
        />

        {/* Preconnect for Performance */}
        <link rel="dns-prefetch" href="https://media.freemalaysiatoday.com" />
        <link rel="preconnect" href="https://media.freemalaysiatoday.com" />
        <link
          rel="dns-prefetch"
          href="https://securepubads.g.doubleclick.net"
        />
        <link rel="preconnect" href="https://securepubads.g.doubleclick.net" />

        {/* Comprehensive JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(aboutPageJsonLD),
          }}
        />
      </Head>

      <div className="px-4 py-6">
        {/* Hero Section with Key Statistics */}
        <header className="text-center mb-12 border-b-4 border-blue-600 dark:border-blue-400 pb-8">
          <h1 className="text-5xl font-extrabold mb-4 text-gray-900 dark:text-white">
            About FMT (Free Malaysia Today)
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-400 mb-6">
            Malaysia&apos;s Independent Voice Since 2009
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                22M+
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Annual Users
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                700K+
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Articles Published
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                32K+
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Videos Published
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                16+
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Years of Service
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - CMS Driven */}
        <article className="prose prose-lg dark:prose-invert max-w-none mb-12">
          {parse(pageData.content, PARSER_OPTIONS)}
        </article>

        {/* Mission Statement */}
        <section
          id="mission"
          className="mb-12 p-8 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Our Mission
          </h2>
          <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            Free Malaysia Today exists to provide Malaysians with accurate,
            unbiased, and timely news coverage. Since 2009, we have been
            presenting news and analyses round the clock, staying true to
            objectivity – the missing dimension in today&apos;s news scene. We
            believe in the power of independent journalism to inform, educate,
            and empower citizens in a democratic society.
          </p>
        </section>

        {/* Coverage & Reach */}
        <section id="reach" className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 pb-2">
            Our Reach
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                Global Audience
              </h3>
              <ul className="space-y-2">
                <li className="flex justify-between dark:text-gray-300">
                  <span>🇲🇾 Malaysia</span>
                  <span className="font-semibold">16M users</span>
                </li>
                <li className="flex justify-between dark:text-gray-300">
                  <span>🇸🇬 Singapore</span>
                  <span className="font-semibold">1.5M users</span>
                </li>
                <li className="flex justify-between dark:text-gray-300">
                  <span>🇺🇸 United States</span>
                  <span className="font-semibold">1.1M users</span>
                </li>
                <li className="flex justify-between dark:text-gray-300">
                  <span>🇻🇳 Vietnam</span>
                  <span className="font-semibold">425K users</span>
                </li>
                <li className="flex justify-between dark:text-gray-300">
                  <span>🇦🇺 Australia</span>
                  <span className="font-semibold">348K users</span>
                </li>
                <li className="flex justify-between dark:text-gray-300">
                  <span>🌍 Others</span>
                  <span className="font-semibold">2.7M users</span>
                </li>
              </ul>
            </div>
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                Social Media Presence
              </h3>
              <ul className="space-y-2">
                <li className="flex justify-between dark:text-gray-300">
                  <span>📘 Facebook</span>
                  <span className="font-semibold">1.09M followers</span>
                </li>
                <li className="flex justify-between dark:text-gray-300">
                  <span>📺 YouTube</span>
                  <span className="font-semibold">647K subscribers</span>
                </li>
                <li className="flex justify-between dark:text-gray-300">
                  <span>🐦 Twitter/X</span>
                  <span className="font-semibold">643K followers</span>
                </li>
                <li className="flex justify-between dark:text-gray-300">
                  <span>🎵 TikTok</span>
                  <span className="font-semibold">642K followers</span>
                </li>
                <li className="flex justify-between dark:text-gray-300">
                  <span>📸 Instagram</span>
                  <span className="font-semibold">246K followers</span>
                </li>
                <li className="flex justify-between dark:text-gray-300">
                  <span>📱 Total Reach</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    3.28M followers
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Editorial Policy */}
        <section
          id="editorial-policy"
          className="mb-12 p-8 rounded-lg border border-blue-100 dark:border-blue-800"
        >
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Editorial Policy
          </h2>
          <p className="text-lg leading-relaxed mb-4 text-gray-700 dark:text-gray-300">
            FMT maintains strict editorial independence and political
            neutrality. We practice objective journalism by reporting facts as
            they are, quoting sources accurately without editorial opinion or
            bias.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <h3 className="font-semibold mb-2 dark:text-white">
                Our Principles:
              </h3>
              <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
                <li>Editorial independence from commercial interests</li>
                <li>Commitment to accuracy and fairness</li>
                <li>Transparent corrections process</li>
                <li>Respect for privacy and dignity</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 dark:text-white">
                Content Standards:
              </h3>
              <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
                <li>Fact-checking before publication</li>
                <li>Multiple source verification</li>
                <li>Clear attribution and sourcing</li>
                <li>Separation of news and opinion</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Leadership Team */}
        <section id="leadership" className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 pb-2">
            Leadership Team
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-2 dark:text-white">
                Dato&apos; Nelson Fernandez
              </h3>
              <p className="text-blue-600 dark:text-blue-400 font-semibold mb-2">
                Executive Chairman & CEO
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Founder of FMT, leading the organization since 2009
              </p>
            </div>
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-2 dark:text-white">
                Azeem Abu Bakar
              </h3>
              <p className="text-blue-600 dark:text-blue-400 font-semibold mb-2">
                Managing Director
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Oversees daily operations and strategic direction
              </p>
            </div>
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-2 dark:text-white">
                Jenn Ngan
              </h3>
              <p className="text-blue-600 dark:text-blue-400 font-semibold mb-2">
                Chief Operating Officer
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manages newsroom operations and editorial workflow
              </p>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section id="contact" className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 pb-2">
            Contact Us
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4 dark:text-white">
                Editorial Inquiries
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-medium dark:text-gray-200">
                    News Tips & Story Ideas
                  </p>
                  <a
                    href="mailto:editor@freemalaysiatoday.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    editor@freemalaysiatoday.com
                  </a>
                </div>
                <div>
                  <p className="font-medium dark:text-gray-200">
                    Letters to the Editor
                  </p>
                  <a
                    href="mailto:letters@freemalaysiatoday.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    letters@freemalaysiatoday.com
                  </a>
                </div>
              </div>
            </div>
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4 dark:text-white">
                Business Inquiries
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-medium dark:text-gray-200">Advertising</p>
                  <a
                    href="mailto:advertise@freemalaysiatoday.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    advertise@freemalaysiatoday.com
                  </a>
                </div>
                <div>
                  <p className="font-medium dark:text-gray-200">
                    Career Opportunities
                  </p>
                  <a
                    href="mailto:career@freemalaysiatoday.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    career@freemalaysiatoday.com
                  </a>
                </div>
                <div>
                  <p className="font-medium dark:text-gray-200">
                    General Inquiries
                  </p>
                  <a
                    href="mailto:admin@freemalaysiatoday.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    admin@freemalaysiatoday.com
                  </a>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Phone: +603 7887 2888
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-3 dark:text-white">
              Our Office
            </h3>
            <address className="not-italic text-gray-700 dark:text-gray-300">
              <strong className="dark:text-white">FMT Media Sdn Bhd</strong>
              <br />
              The West Wing, Menara Axis
              <br />
              Ground Floor, Quattro West
              <br />
              4, Persiaran Barat
              <br />
              Petaling Jaya, Selangor 46200
              <br />
              Malaysia
            </address>
          </div>
        </section>

        {/* FAQ Section - Accordion Style */}
        <section id="faq" className="mb-12 sr-only">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 pb-2">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <FAQAccordion key={index} faq={faq} index={index} />
            ))}
          </div>
        </section>

        {/* Content Partnerships */}
        <section
          id="partnerships"
          className="mb-12 p-8 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Content Partnerships
          </h2>
          <p className="text-lg mb-4 text-gray-700 dark:text-gray-300">
            FMT partners with leading news agencies to provide comprehensive
            coverage:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded border border-gray-200 dark:border-gray-700">
              <p className="font-semibold dark:text-white">AFP</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Agence France-Presse
              </p>
            </div>
            <div className="text-center p-4 rounded border border-gray-200 dark:border-gray-700">
              <p className="font-semibold dark:text-white">Reuters</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                International News
              </p>
            </div>
            <div className="text-center p-4 rounded border border-gray-200 dark:border-gray-700">
              <p className="font-semibold dark:text-white">Bernama</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Malaysian News Agency
              </p>
            </div>
            <div className="text-center p-4 rounded border border-gray-200 dark:border-gray-700">
              <p className="font-semibold dark:text-white">EXT Daily</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Content Partner
              </p>
            </div>
          </div>
        </section>
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
      {/* <AdSlot
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
      /> */}
    </>
  );
};

export default AboutPage;
