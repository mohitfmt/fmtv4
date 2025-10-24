// pages/advertise/index.tsx
// ULTIMATE VERSION with Premium Audience Data (Jan-Aug 2025)

import { useState } from "react";
import Head from "next/head";
import AdSlot from "@/components/common/AdSlot";
import { ObfuscatedEmail } from "@/components/common/ObfuscatedContacts";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";
import siteConfig from "@/constants/site-config";
import { generateAdvertisePageJsonLD } from "@/constants/jsonlds/advertise-page-json-ld";
import { defaultAlternateLocale } from "@/constants/alternate-locales";
import {
  FiChevronDown,
  FiChevronUp,
  FiMail,
  FiPhone,
  FiTrendingUp,
  FiUsers,
  FiTarget,
} from "react-icons/fi";
import Link from "next/link";

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
        "FMT reaches 22 million readers annually with 183 million pageviews (Jan-Aug 2025 data). Our social media generates 15.6 billion impressions annually and 2.9 billion video views. Our audience is concentrated in Malaysia's economic centers (Kuala Lumpur 75%, Selangor 70%), primarily aged 35-54 (68%), with 74% being middle-to-high income earners.",
    },
    {
      question: "What makes FMT's audience premium?",
      answer:
        "Three in four FMT readers are middle-to-high income earners with strong purchasing power. 68% are in the prime spending age of 35-54 years, and nearly half hold university degrees. This affluent, educated demographic actively researches and shops online across diverse categories including electronics, fashion, automotive, and lifestyle products.",
    },
    {
      question: "What advertising formats does FMT offer?",
      answer:
        "FMT offers comprehensive advertising solutions: Display banner ads (multiple sizes and placements), native advertising that matches editorial style, video advertising reaching 244 million monthly views, sponsored content written by our editorial team, and social media promotion across 3 million followers. We also offer custom packages combining multiple formats for maximum impact.",
    },
    {
      question: "How do I get advertising rates and media kit?",
      answer:
        "Contact our advertising team at advertise@freemalaysiatoday.com or call +603 7887 2888. We'll provide a comprehensive media kit with detailed rates, audience demographics, case studies, and custom package options tailored to your campaign objectives and budget.",
    },
    {
      question: "What makes FMT different from other Malaysian news sites?",
      answer:
        "FMT combines massive reach (183M annual pageviews, 15.6B social impressions) with a premium, affluent audience. Unlike competitors, 74% of our readers are middle-to-high income earners actively shopping across multiple categories. One FMT campaign can achieve reach comparable to advertising across 20+ different platforms, with better targeting and streamlined management.",
    },
    {
      question: "How quickly can my campaign launch?",
      answer:
        "Standard display and native ad campaigns can launch within 48-72 hours of creative approval. Video and sponsored content campaigns typically require 5-7 business days for production and review. Rush campaigns may be accommodated based on availability - contact us to discuss your timeline.",
    },
    {
      question: "Do you offer packages or custom solutions?",
      answer:
        "Yes, both! We offer pre-designed packages combining multiple ad formats for common objectives (brand awareness, product launches, etc.), as well as fully custom solutions tailored to your specific goals, target audience, and budget. Our team works with you to design the optimal campaign strategy.",
    },
    {
      question: "Can I target specific audiences or demographics?",
      answer:
        "Absolutely! Target by content section (news, business, lifestyle, sports), geographic location (Kuala Lumpur, Selangor, nationwide), device type (mobile, desktop, tablet), and time of day. We can also create custom audience segments based on interests and behaviors for premium targeting.",
    },
    {
      question: "What are your payment terms?",
      answer:
        "For new advertisers, we typically require 50% upfront payment with balance due before campaign launch. Established clients with credit approval can access net 30-60 day terms. We accept bank transfers, checks, and credit cards. Flexible payment arrangements are available for long-term contracts.",
    },
    {
      question: "How do I track my campaign performance?",
      answer:
        "All campaigns include comprehensive analytics: impressions delivered, click-through rates, viewability metrics, geographic breakdown, and device performance. Video campaigns include view-through rates and engagement metrics. We provide weekly performance reports and are available for optimization consultations throughout your campaign.",
    },
  ];

  return (
    <>
      <Head>
        {/* Basic Meta Tags - AI-Optimized */}
        <title>
          Advertise with FMT - Reach 22M+ Affluent Malaysian Readers | Premium
          News Advertising
        </title>
        <meta
          name="description"
          content="Advertise with Free Malaysia Today (FMT) and reach 22M+ affluent Malaysian readers annually. 183M pageviews, 15.6B social impressions, 2.9B video views. Premium audience: 74% middle-to-high income, 68% prime spending age (35-54), high purchase intent across electronics, fashion, automotive, lifestyle. Display, native, video, sponsored content options."
        />

        {/* AI Search Keywords - Natural Language Queries */}
        <meta
          name="keywords"
          content="advertise Malaysia news, FMT advertising rates, Free Malaysia Today ads, premium Malaysian audience, affluent readers Malaysia, high income demographics, middle class advertising, professional audience Malaysia, news portal advertising, digital advertising Malaysia, Malaysian media kit, advertising solutions Malaysia, reach Malaysian consumers, business advertising Malaysia, brand awareness Malaysia"
        />

        {/* Open Graph Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={fullUrl} />
        <meta
          property="og:title"
          content="Advertise with FMT - Reach 22M+ Affluent Readers Annually"
        />
        <meta
          property="og:description"
          content="Reach Malaysia's premium audience: 22M+ readers, 183M annual pageviews, 15.6B social impressions. 74% middle-to-high income, 68% age 35-54. Display, native, video & sponsored content."
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
          content="Advertise with FMT - Premium Malaysian Audience"
        />
        <meta
          name="twitter:description"
          content="22M+ affluent readers, 183M pageviews, 15.6B impressions annually. 74% middle-to-high income audience."
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
            Reach Malaysia&apos;s Most Affluent & Engaged News Audience
          </p>

          {/* Key Stats Grid - UPDATED with new data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                22M+
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Annual Readers*
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                183M
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Annual Pageviews*
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                15.6B
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Social Impressions*
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                2.9B
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Video Views*
              </div>
            </div>
          </div>
        </header>

        {/* Why Advertise with FMT Section - Enhanced with integrated data */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 pb-2">
            Why Advertise with FMT
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-start gap-3 mb-3">
                <FiUsers className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2 dark:text-white">
                    🎯 Malaysia&apos;s Leading Independent News
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Trusted by millions for fair, balanced reporting. Your brand
                    benefits from association with Malaysia&apos;s most
                    respected independent news platform with 15+ years of
                    editorial excellence.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-start gap-3 mb-3">
                <FiTrendingUp className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2 dark:text-white">
                    💎 Premium Affluent Audience
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    3 in 4 readers are middle-to-high income earners with strong
                    purchasing power. Nearly half hold university degrees.
                    Concentrated in Malaysia&apos;s economic centers (KL 75%,
                    Selangor 70%).
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-start gap-3 mb-3">
                <FiTarget className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2 dark:text-white">
                    🛍️ High Purchase Intent
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Audience actively researches and shops online across diverse
                    categories. Strong intent for electronics, fashion,
                    automotive, home goods, and more. These are consumers ready
                    to buy, not just browse.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                🎯 Targeted Solutions
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Target by section, geography, device, or demographics. From
                broad brand awareness to laser-focused campaigns, we&apos;ll
                help you reach exactly the audience you need with measurable
                results.
              </p>
            </div>
          </div>
        </section>

        {/* NEW: Premium Audience Profile Section */}
        <section className="mb-12 p-8 rounded-lg bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
          <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white text-center">
            The FMT Audience: Malaysia&apos;s Premium Consumers
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
            Your ads don&apos;t just reach people—they reach the right people.
            Affluent, educated professionals who drive Malaysia&apos;s economy.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Income */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-blue-100 dark:border-blue-900">
              <div className="text-4xl mb-3 text-center">💰</div>
              <h3 className="text-xl font-bold mb-3 text-center dark:text-white">
                Affluent Earners
              </h3>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  74%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Middle-to-High Income
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                Significant disposable income and purchasing power. These
                consumers don&apos;t just window shop—they buy.
              </p>
            </div>

            {/* Age */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-blue-100 dark:border-blue-900">
              <div className="text-4xl mb-3 text-center">🎯</div>
              <h3 className="text-xl font-bold mb-3 text-center dark:text-white">
                Prime Spending Age
              </h3>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  68%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Aged 35-54 Years
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                Peak earning and spending years. Household decision-makers with
                established careers and stable incomes.
              </p>
            </div>

            {/* Education */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-blue-100 dark:border-blue-900">
              <div className="text-4xl mb-3 text-center">🎓</div>
              <h3 className="text-xl font-bold mb-3 text-center dark:text-white">
                Highly Educated
              </h3>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  48%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  University Degrees
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                Professionals and executives. Quality-conscious consumers who
                value brand reputation and research purchases.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-center text-sm text-gray-700 dark:text-gray-300">
              <strong className="text-blue-600 dark:text-blue-400">
                Strategic Advantage:
              </strong>{" "}
              Concentrated in Malaysia&apos;s economic powerhouses (Kuala Lumpur
              & Selangor), our audience represents the country&apos;s most
              influential consumers—the ones who set trends, make major purchase
              decisions, and drive market growth.
            </p>
          </div>
        </section>

        {/* Advertising Solutions Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-blue-600 dark:border-blue-400 pb-2">
            Advertising Solutions
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                📱 Display Advertising
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Premium banner placements across high-traffic pages. Multiple
                sizes and positions available for maximum visibility and
                engagement.
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>✓ Leaderboard, rectangles, skyscrapers</li>
                <li>✓ Above-fold premium positions</li>
                <li>✓ Responsive for all devices</li>
              </ul>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                📰 Native Advertising
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Sponsored content that seamlessly matches FMT&apos;s editorial
                style. Engage readers naturally without disrupting their
                experience.
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>✓ Editorial-style content</li>
                <li>✓ Integrated with news feed</li>
                <li>✓ Higher engagement rates</li>
              </ul>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                🎥 Video Advertising
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Reach 244 million monthly video views with pre-roll, mid-roll,
                or display video ads. Powerful storytelling with massive reach.
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>✓ 244M monthly video views</li>
                <li>✓ Pre-roll & mid-roll options</li>
                <li>✓ High completion rates</li>
              </ul>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                ✍️ Sponsored Content
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Full-length articles written by FMT&apos;s editorial team,
                promoting your brand message with editorial credibility.
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>✓ Written by professional journalists</li>
                <li>✓ SEO-optimized for discovery</li>
                <li>✓ Long-term content value</li>
              </ul>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                📲 Social Media Promotion
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Amplify your message across 3 million followers on Facebook,
                Twitter, Instagram, YouTube, and TikTok.
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>✓ 3M combined followers</li>
                <li>✓ 15.6B annual impressions</li>
                <li>✓ Multi-platform campaigns</li>
              </ul>
            </div>

            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <h3 className="text-xl font-semibold mb-3 dark:text-white">
                📦 Custom Packages
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Combine multiple formats for integrated campaigns. We&apos;ll
                design the perfect solution for your objectives and budget.
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>✓ Multi-format integration</li>
                <li>✓ Flexible pricing</li>
                <li>✓ Dedicated campaign support</li>
              </ul>
            </div>
          </div>
        </section>

        {/* NEW: Amplify Your Reach Section */}
        <section className="mb-12 p-8 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white text-center">
            Amplify Your Reach Beyond FMT
          </h2>
          <p className="text-lg text-center text-gray-700 dark:text-gray-300 mb-6 max-w-3xl mx-auto">
            One campaign with FMT can potentially reach audiences across
            Malaysia&apos;s leading digital news and entertainment network.
          </p>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-purple-200 dark:border-purple-800 mb-6">
            <p className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-4">
              Why advertise with 20+ different platforms when one partnership
              can achieve comparable reach?
            </p>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Diverse Audiences
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Access complementary audience segments across news,
                    lifestyle, business, and entertainment.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Consistent Brand Presence
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Maintain unified messaging across Malaysia&apos;s most
                    trusted platforms.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Streamlined Management
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    One contact, one contract, one invoice. Simplified campaign
                    execution.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Better ROI
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Consolidated media buying delivers more value and efficiency
                    than fragmented campaigns.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Contact our team to discuss network-wide campaigns and exclusive
            partnership opportunities.
          </p>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 dark:from-blue-800 dark:via-blue-700 dark:to-blue-800 p-6 md:p-12 mb-12 text-center rounded-xl shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Ready to Reach 22 Million Affluent Readers?
          </h2>
          <p className="text-base md:text-xl text-blue-100 mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            Get your custom media kit, rate card, and audience demographics
            today. Our team will design the perfect campaign for your
            objectives.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link
              href="mailto:advertise@freemalaysiatoday.com"
              className="bg-white text-blue-600 hover:bg-blue-50 px-4 md:px-8 py-3 md:py-4 rounded-lg font-bold text-sm md:text-lg flex items-center justify-center gap-2 transition-all hover:shadow-lg w-full md:w-auto"
            >
              <FiMail className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">advertise@freemalaysiatoday.com</span>
            </Link>
            <Link
              href="tel:+60378872888"
              className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2 transition-all hover:shadow-lg border-2 border-white"
            >
              <FiPhone className="w-5 h-5" />
              +603 7887 2888
            </Link>
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
              <Link
                href="tel:+60378872888"
                className="text-blue-600 dark:text-blue-400 hover:underline text-lg font-medium"
              >
                +603 7887 2888
              </Link>
            </div>
          </div>
        </section>

        {/* Data Source Footnote */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-4xl mx-auto">
            *Data verification: Annual figures calculated from verified
            January–August 2025 analytics.
            <strong className="text-gray-600 dark:text-gray-300">
              {" "}
              22M annual readers
            </strong>{" "}
            = Google Analytics actual data (GA4 verified).
            <strong className="text-gray-600 dark:text-gray-300">
              {" "}
              183M annual pageviews
            </strong>{" "}
            = 122M pageviews (Jan-Aug 2025) annualized (122M ÷ 8 × 12).
            <strong className="text-gray-600 dark:text-gray-300">
              {" "}
              15.6B social impressions
            </strong>{" "}
            = 1.3B monthly impressions × 12 months.
            <strong className="text-gray-600 dark:text-gray-300">
              {" "}
              2.9B video views
            </strong>{" "}
            = 244M monthly views × 12 months. Audience demographics sourced from
            Google Analytics, Lotame DMP, and verified third-party analytics
            (Jan-Aug 2025). All metrics tracked and reported transparently.
            Contact us for detailed analytics reports and methodology.
          </p>
        </div>
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
