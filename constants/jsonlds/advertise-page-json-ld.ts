// constants/jsonlds/advertise-page-json-ld.ts

import siteConfig from "@/constants/site-config";
import { getLightweightOrganization } from "./shared-schemas";

/**
 * Generate comprehensive Advertise page JSON-LD with Service and Offer schemas
 */
export const generateAdvertisePageJsonLD = () => {
  const baseUrl = siteConfig.baseUrl;

  return {
    "@context": "https://schema.org",
    "@graph": [
      // 1. Service Schema - Advertising Services
      {
        "@type": "Service",
        "@id": `${baseUrl}/advertise#service`,
        name: "Digital Advertising Services by FMT",
        description:
          "Reach 22 million annual users across Malaysia and Southeast Asia with FMT's premium digital advertising solutions. Display ads, native advertising, video advertising, and sponsored content.",
        provider: getLightweightOrganization(), // ✅ FIXED: Use full org schema instead of @id reference
        serviceType: "Digital Advertising",
        areaServed: [
          {
            "@type": "Country",
            name: "Malaysia",
          },
          {
            "@type": "Country",
            name: "Singapore",
          },
          {
            "@type": "Country",
            name: "United States",
          },
        ],
        audience: {
          "@type": "Audience",
          audienceType: "Business Decision Makers, Consumers, Professionals",
          geographicArea: {
            "@type": "AdministrativeArea",
            name: "Malaysia",
          },
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "FMT Advertising Packages",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Display Advertising",
                description:
                  "Premium banner ads across FMT's high-traffic pages. Multiple sizes and placements available.",
              },
              category: "Display Ads",
              availability: "https://schema.org/InStock",
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Native Advertising",
                description:
                  "Sponsored content that matches FMT's editorial style and engages readers naturally.",
              },
              category: "Native Ads",
              availability: "https://schema.org/InStock",
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Video Advertising",
                description:
                  "Reach 31,600+ video viewers with pre-roll, mid-roll, or display video ads.",
              },
              category: "Video Ads",
              availability: "https://schema.org/InStock",
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Sponsored Content",
                description:
                  "Full-length articles written by FMT's editorial team promoting your brand message.",
              },
              category: "Sponsored Content",
              availability: "https://schema.org/InStock",
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Social Media Promotion",
                description:
                  "Amplify your message to 3.28 million followers across Facebook, Twitter, Instagram, YouTube, and TikTok.",
              },
              category: "Social Media",
              availability: "https://schema.org/InStock",
            },
          ],
        },
        availableChannel: {
          "@type": "ServiceChannel",
          serviceUrl: `${baseUrl}/advertise`,
          servicePhone: "+60378872888",
          availableLanguage: ["English", "Bahasa Malaysia"],
          serviceLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              streetAddress: "A-27-5, Menara Southpoint, Mid Valley City",
              addressLocality: "Petaling Jaya",
              addressRegion: "Selangor",
              postalCode: "59200",
              addressCountry: "MY",
            },
          },
        },
      },

      // 2. ContactPoint for Advertising Sales
      {
        "@type": "ContactPoint",
        "@id": `${baseUrl}/advertise#contact`,
        contactType: "advertising sales",
        email: "advertise@freemalaysiatoday.com",
        telephone: "+60378872888",
        availableLanguage: ["English", "Bahasa Malaysia"],
        areaServed: ["MY", "SG", "US"],
      },

      // 3. WebPage Schema for /advertise
      {
        "@type": "WebPage",
        "@id": `${baseUrl}/advertise#webpage`,
        url: `${baseUrl}/advertise`,
        name: "Advertise with FMT (Free Malaysia Today) - Reach 22M Annual Users",
        description:
          "Reach Malaysia's most engaged news audience with FMT's digital advertising solutions. 22M annual users, 2.3M monthly active users, 3.28M social media followers. Display, native, video, and sponsored content options available.",
        inLanguage: "en-MY",
        isPartOf: {
          "@id": `${baseUrl}#website`,
        },
        about: {
          "@id": `${baseUrl}/advertise#service`,
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${baseUrl}/PreviewLinkImage.png`,
          width: 1200,
          height: 630,
          caption: "Advertise with Free Malaysia Today",
        },
        datePublished: "2009-11-01",
        dateModified: new Date().toISOString(),
        publisher: getLightweightOrganization(), // ✅ FIXED: Use full org schema instead of inline
      },

      // 4. BreadcrumbList Schema
      {
        "@type": "BreadcrumbList",
        "@id": `${baseUrl}/advertise#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: baseUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Advertise With Us",
            item: `${baseUrl}/advertise`,
          },
        ],
      },

      // 5. FAQPage Schema - Common Advertiser Questions
      {
        "@type": "FAQPage",
        "@id": `${baseUrl}/advertise#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is FMT's audience reach?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FMT reaches 22 million active users annually, with 2.3 million monthly active users and 184,000 daily active users. Our content reaches readers in Malaysia (73% of traffic), Singapore, United States, Vietnam, Australia, United Kingdom, and India. Our social media platforms have a combined following of 3.28 million followers.",
            },
          },
          {
            "@type": "Question",
            name: "What advertising formats does FMT offer?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FMT offers multiple advertising formats including display banner ads (various sizes), native advertising, video advertising (pre-roll and display), sponsored content articles, and social media promotion across our 3.28 million social media followers. We also offer custom packages combining multiple formats.",
            },
          },
          {
            "@type": "Question",
            name: "How do I get advertising rates and media kit?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Contact our advertising team at advertise@freemalaysiatoday.com or call +603 7887 2888. We'll provide detailed rate cards, audience demographics, and custom package options based on your campaign goals.",
            },
          },
          {
            "@type": "Question",
            name: "What makes FMT different from other Malaysian news sites?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FMT is Malaysia's leading independent news organization with strict editorial independence and political neutrality. We offer bilingual coverage (English & Bahasa Malaysia), reaching both local and international audiences with 700,000+ articles and 31,600+ videos since 2009. Our audience is highly engaged with an average engagement time of 4 minutes 42 seconds per visit.",
            },
          },
          {
            "@type": "Question",
            name: "Can I target specific audience segments?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes! FMT offers targeted advertising across specific sections (Politics, Business, Lifestyle, Sports), geographic targeting (Malaysia, Singapore, international), device targeting (desktop, mobile), and demographic targeting. Contact our team to discuss your specific targeting needs.",
            },
          },
          {
            "@type": "Question",
            name: "What is the minimum advertising commitment?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "We offer flexible packages to suit different budgets, from single-day campaigns to annual contracts. Contact advertise@freemalaysiatoday.com for detailed pricing and minimum commitment information based on your selected advertising format.",
            },
          },
        ],
      },
    ],
  };
};
