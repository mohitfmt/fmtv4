// pages/advertise/index.tsx

import { useState } from "react";
import Head from "next/head";
import AdSlot from "@/components/common/AdSlot";
import { ObfuscatedEmail } from "@/components/common/ObfuscatedContacts";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";
import siteConfig from "@/constants/site-config";
import { generateAdvertisePageJsonLD } from "@/constants/jsonlds/advertise-page-json-ld";
import { defaultAlternateLocale } from "@/constants/alternate-locales";
import { FiChevronDown, FiChevronUp, FiMail, FiPhone } from "react-icons/fi";

const dfpTargetingParams = {
  pos: "listing",
  section: ["advertise"],
  key: ["Advertise", ...gerneralTargetingKeys],
};

// FAQ Accordion Component
const FAQAccordion = ({
  faq,
  index,
}: {
  faq: { question: string; answer: string };
  index: number;
}) => {
  const [isOpen, setIsOpen] = useState(index === 0);

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
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {faq.answer}
          </p>
        </div>
      )}
    </div>
  );
};

const Advertise = () => {
  const advertiseJsonLD = generateAdvertisePageJsonLD();
  const fullUrl = `${siteConfig.baseUrl}/advertise`;

  const faqs = [
    {
      question: "What is FMT's audience reach?",
      answer:
        "FMT reaches 22 million active users annually, with 2.3 million monthly active users and 484,000 daily active users. Our content reaches readers in Malaysia (73% of traffic), Singapore, United States, Vietnam, Australia, United Kingdom, and India. Our social media platforms have a combined following of 3.28 million followers.",
    },
    {
      question: "What advertising formats does FMT offer?",
      answer:
        "FMT offers multiple advertising formats including display banner ads (various sizes), native advertising, video advertising (pre-roll and display), sponsored content articles, and social media promotion across our 3.28 million social media followers. We also offer custom packages combining multiple formats.",
    },
    {
      question: "How do I get advertising rates and media kit?",
      answer:
        "Contact our advertising team at advertise@freemalaysiatoday.com or call +603 7887 2888. We'll provide detailed rate cards, audience demographics, and custom package options based on your campaign goals.",
    },
    {
      question: "What makes FMT different from other Malaysian news sites?",
      answer:
        "FMT is Malaysia's leading independent news organization with strict editorial independence and political neutrality. We offer bilingual coverage (English & Bahasa Malaysia), reaching both local and international audiences with 700,000+ articles and 31,600+ videos since 2009. Our audience is highly engaged with an average engagement time of 4 minutes 42 seconds per visit.",
    },
    {
      question: "Can I target specific audience segments?",
      answer:
        "Yes! FMT offers targeted advertising across specific sections (Politics, Business, Lifestyle, Sports), geographic targeting (Malaysia, Singapore, international), device targeting (desktop, mobile), and demographic targeting. Contact our team to discuss your specific targeting needs.",
    },
    {
      question: "What is the minimum advertising commitment?",
      answer:
        "We offer flexible packages to suit different budgets, from single-day campaigns to annual contracts. Contact advertise@freemalaysiatoday.com for detailed pricing and minimum commitment information based on your selected advertising format.",
    },
  ];

  return (
    <>
      <Head>
        {/* Basic Meta Tags */}
        <title>
          Advertise with FMT (Free Malaysia Today) - Reach 22M Annual Users
        </title>
        <meta
          name="description"
          content="Reach Malaysia's most engaged news audience with FMT's digital advertising solutions. 22M annual users, 2.3M monthly active users, 3.28M social media followers. Display, native, video, and sponsored content options available."
        />

        {/* Keywords */}
        <meta
          name="keywords"
          content="FMT advertising, Free Malaysia Today ads, advertise Malaysia news, digital advertising Malaysia, banner ads Malaysia, native advertising, video ads, sponsored content, Malaysian audience, news advertising, reach Malaysian consumers, business advertising Malaysia"
        />

        {/* Open Graph Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={fullUrl} />
        <meta
          property="og:title"
          content="Advertise with FMT - Reach 22M+ Annual Users in Malaysia"
        />
        <meta
          property="og:description"
          content="Reach Malaysia's largest independent news audience. 22M annual users, 3.28M social followers. Display, native, video & sponsored content. Contact us for rates."
        />
        <meta
          property="og:image"
          content={`${siteConfig.baseUrl}/PreviewLinkImage.png`}
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Free Malaysia Today" />
        <meta property="og:locale" content="en_MY" />
        {defaultAlternateLocale?.map((locale: string) => (
          <meta key={locale} property="og:locale:alternate" content={locale} />
        ))}

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta
          name="twitter:title"
          content="Advertise with FMT - 22M+ Annual Reach"
        />
        <meta
          name="twitter:description"
          content="Reach Malaysia's independent news audience. Display, native, video & sponsored content."
        />
        <meta
          name="twitter:image"
          content={`${siteConfig.baseUrl}/PreviewLinkImage.png`}
        />

        {/* Canonical URL */}
        <link rel="canonical" href={fullUrl} />

        {/* Robots Meta */}
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(advertiseJsonLD),
          }}
        />
      </Head>

      <div className="px-4 py-6">
        {/* Hero Section */}
        <header className="text-center mb-12 pb-8 border-b-4 border-blue-600 dark:border-blue-400">
          <h1 className="text-5xl font-extrabold mb-4 text-gray-900 dark:text-white">
            Advertise with FMT
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-400 mb-6">
            Reach Malaysia&apos;s Most Engaged News Audience
          </p>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                22M+
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Annual Users
              </div>
            </div>
            <div className="p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                2.3M
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Monthly Users
              </div>
            </div>
            <div className="p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                3.28M
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Social Followers
              </div>
            </div>
            <div className="p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                4m 42s
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Avg. Engagement
              </div>
            </div>
          </div>
        </header>

        {/* Desktop Ad */}
        <div className="ads-dynamic-desktop">
          <AdSlot
            sizes={[
              [970, 90],
              [970, 250],
              [728, 90],
            ]}
            targetingParams={dfpTargetingParams}
            id="div-gpt-ad-1661333181124-0"
            name="ROS_Billboard"
            visibleOnDevices="onlyDesktop"
          />
        </div>

        {/* Mobile Ad */}
        <div className="ads-small-mobile">
          <AdSlot
            sizes={[
              [320, 50],
              [320, 100],
            ]}
            targetingParams={dfpTargetingParams}
            id="div-gpt-ad-1661362470988-0"
            name="ROS_Mobile_Leaderboard"
            visibleOnDevices="onlyMobile"
          />
        </div>

        {/* Why Advertise with FMT */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 pb-2">
            Why Advertise with FMT?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400">
                📊 Massive Reach
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                22 million annual users across Malaysia and Southeast Asia.
                Reach decision-makers, consumers, and professionals in your
                target market.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400">
                🎯 Engaged Audience
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Average engagement time of 4 minutes 42 seconds per visit. Your
                ads reach readers who actively consume content, not passive
                scrollers.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400">
                🌐 Multi-Platform
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Reach audiences across website, mobile apps, and 3.28M social
                media followers on Facebook, YouTube, Instagram, TikTok, and
                Twitter.
              </p>
            </div>
          </div>
        </section>

        {/* Audience Demographics */}
        <section className="mb-12 p-8 rounded-lg border border-blue-100 dark:border-blue-800">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
            Our Audience
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 dark:text-white">
                Geographic Reach
              </h3>
              <ul className="space-y-2">
                <li className="flex justify-between dark:text-gray-300">
                  <span>🇲🇾 Malaysia</span>
                  <span className="font-semibold">16M users (73%)</span>
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
                  <span>🌍 Others</span>
                  <span className="font-semibold">2.4M users</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4 dark:text-white">
                Content Interests
              </h3>
              <ul className="space-y-2 dark:text-gray-300">
                <li>
                  🏛️ <strong>Politics</strong> - Decision makers, policy
                  watchers
                </li>
                <li>
                  💼 <strong>Business</strong> - Professionals, entrepreneurs
                </li>
                <li>
                  🎨 <strong>Lifestyle</strong> - Consumers, trendsetters
                </li>
                <li>
                  ⚽ <strong>Sports</strong> - Active sports enthusiasts
                </li>
                <li>
                  🌍 <strong>World News</strong> - Internationally-minded
                  readers
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Advertising Solutions */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 pb-2">
            Advertising Solutions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                Display Advertising
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Premium banner ads across high-traffic pages. Multiple sizes and
                placements available.
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>✅ Billboard (970x250, 728x90)</li>
                <li>✅ Leaderboard (728x90, 320x50)</li>
                <li>✅ Rectangle (300x250)</li>
                <li>✅ Halfpage (300x600)</li>
              </ul>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                Native Advertising
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Sponsored content that matches FMT&apos;s editorial style and engages
                readers naturally.
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>✅ Editorial-style content</li>
                <li>✅ In-feed placements</li>
                <li>✅ Recommended articles</li>
                <li>✅ Branded storytelling</li>
              </ul>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                Video Advertising
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Reach 31,600+ video viewers with pre-roll, mid-roll, or display
                video ads.
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>✅ Pre-roll video ads</li>
                <li>✅ In-stream video ads</li>
                <li>✅ Shorts advertising</li>
                <li>✅ YouTube integration</li>
              </ul>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                Social Media Promotion
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Amplify your message to 3.28 million followers across all
                platforms.
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>✅ Facebook (1.09M followers)</li>
                <li>✅ YouTube (647K subscribers)</li>
                <li>✅ TikTok (642K followers)</li>
                <li>✅ Instagram (246K followers)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Why FMT Stands Out */}
        <section className="mb-12 p-8 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
            Why FMT Stands Out
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                🎖️ Editorial Independence
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                As Malaysia&apos;s leading independent news organization, FMT&apos;s
                audience trusts our content. Your brand benefits from this
                credibility and trust.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                🗣️ Bilingual Coverage
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Reach both English and Bahasa Malaysia audiences with one
                platform. Perfect for brands targeting all Malaysians.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                📈 Proven Track Record
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Since 2009, FMT has grown to 700,000+ articles and 31,600+
                videos. We know how to engage audiences and drive results.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                🎯 Targeted Solutions
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Target by section, geography, device, or demographics. We&apos;ll
                help you reach exactly the audience you need.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-blue-700 dark:bg-blue-800 p-20 mb-12 text-center rounded-lg">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Ready to Reach 22 Million Users?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get your custom media kit, rate card, and audience demographics
            today
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <a
              href="mailto:advertise@freemalaysiatoday.com"
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2 transition-colors"
            >
              <FiMail className="w-5 h-5" />
              advertise@freemalaysiatoday.com
            </a>
            <a
              href="tel:+60378872888"
              className="bg-blue-700 hover:bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2 transition-colors"
            >
              <FiPhone className="w-5 h-5" />
              +603 7887 2888
            </a>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 pb-2">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <FAQAccordion key={index} faq={faq} index={index} />
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="mb-12 p-8 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white text-center">
            Get in Touch
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <FiMail className="w-12 h-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-semibold mb-2 dark:text-white">
                Email Us
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                For rates, media kit, and inquiries
              </p>
              <ObfuscatedEmail
                email="advertise@freemalaysiatoday.com"
                className="text-blue-600 dark:text-blue-400 hover:underline text-lg font-medium"
              />
            </div>
            <div className="text-center">
              <FiPhone className="w-12 h-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-semibold mb-2 dark:text-white">
                Call Us
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                Speak with our advertising team
              </p>
              <a
                href="tel:+60378872888"
                className="text-blue-600 dark:text-blue-400 hover:underline text-lg font-medium"
              >
                +603 7887 2888
              </a>
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

export default Advertise;
