// constants/jsonlds/org.ts

import siteConfig from "../site-config";

/**
 * OrgJsonLD - Lightweight organization schema
 * SINGLE SOURCE OF TRUTH for basic organization data
 */
export const OrgJsonLD = {
  "@context": "https://www.schema.org",
  "@type": "NewsMediaOrganization",
  additionalType: "Organization",
  name: `${siteConfig.siteName}`,
  legalName: "FMT Media Sdn Bhd",
  slogan: `${siteConfig.tagline}`,
  url: `${siteConfig.baseUrl}`,
  foundingDate: "2009-11-01",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    telephone: "+60378872888",
  },
  email: "mailto:admin@freemalaysiatoday.com",
  knowsLanguage: ["Malay", "English"],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: 4.4,
    ratingCount: 2608867,
  },
  numberOfEmployees: {
    "@type": "QuantitativeValue",
    minValue: 100,
    maxValue: 500,
  },
  mainEntityOfPage: {
    "@type": "WebSite",
    "@id": "https://www.freemalaysiatoday.com/",
    url: "https://www.freemalaysiatoday.com/",
  },
  isAccessibleForFree: true,
  sameAs: [
    // Facebook Profiles
    "https://www.facebook.com/freemalaysiatoday", // Main English
    "https://www.facebook.com/beritafmt", // Bahasa Malaysia
    "https://www.facebook.com/fmtlifestyle", // Lifestyle section

    // Twitter/X
    "https://x.com/fmtoday", // Rebranded from Twitter

    // Instagram
    "https://www.instagram.com/freemalaysiatoday", // Main
    "https://www.instagram.com/fmtlifestyle", // Lifestyle

    // YouTube
    "https://www.youtube.com/@FreeMalaysiaToday", // Modern handle format

    // Professional Networks
    "https://www.linkedin.com/company/fmt-news",

    // TikTok (3 channels)
    "https://www.tiktok.com/@freemalaysiatoday", // Main English
    "https://www.tiktok.com/@berita.fmt", // Bahasa Malaysia
    "https://www.tiktok.com/@fmt.lifestyle", // Lifestyle

    // Messaging Platforms
    "https://t.me/FreeMalaysiaToday", // Telegram
    "https://www.whatsapp.com/channel/0029Va78sJa96H4VaQu6580F", // WhatsApp Channel

    // Wikipedia
    "https://en.wikipedia.org/wiki/Free_Malaysia_Today",
    "https://ms.wikipedia.org/wiki/Free_Malaysia_Today",
  ],

  logo: {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    url: siteConfig.iconPath,
    contentUrl: siteConfig.iconPath,
    width: 512,
    height: 512,
    creditText: "Free Malaysia Today",
    license: `${siteConfig.baseUrl}/privacy-policy/`,
    acquireLicensePage: `${siteConfig.baseUrl}/privacy-policy/`,
    creator: {
      "@id": `${siteConfig.baseUrl}#organization`,
    },
    copyrightNotice: `© ${siteConfig.siteName}, ${new Date().getFullYear()}`,
  },
  description: `${siteConfig.siteDescription}`,
  location: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      streetAddress:
        "The West Wing, Menara Axis, Ground Floor, Quattro West, 4, Persiaran Barat",
      addressLocality: "Petaling Jaya",
      addressRegion: "Selangor",
      postalCode: "46200",
      addressCountry: "MY",
    },
    name: "FMT Media Sdn Bhd",
    sameAs: `${siteConfig.baseUrl}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: "3.1037209336764953",
      longitude: "101.64165328465576",
    },
  },
  alternateName: [
    "FMT",
    "FreeMalaysiaToday",
    "Free Malaysia Today",
    "fmtoday",
    "FMT News",
    "FMTNews",
    "FMT Media Sdn Bhd",
    "FMT Media",
  ].join(", "),
  keywords: [
    "Free Malaysia Today",
    "Malaysia News",
    "Latest Malaysia News",
    "Breaking News Malaysia",
    "Malaysia Politics News",
    "Malaysia Economic News",
    "Malaysia International News",
    "Free News Malaysia",
    "24/7 News Malaysia",
    "Malaysian Cultural News",
    "English Malay News Online",
    "Comprehensive Malaysian News.",
  ].join(", "),
};

export const FullOrgJsonLD = {
  ...OrgJsonLD, // Start with lightweight base

  // ✅ Enhanced contact points (5 different types)
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "editorial",
      email: "editor@freemalaysiatoday.com",
      availableLanguage: ["English", "Bahasa Malaysia"],
      description: "For news tips and editorial queries",
    },
    {
      "@type": "ContactPoint",
      contactType: "advertising sales",
      email: "advertise@freemalaysiatoday.com",
      availableLanguage: ["English", "Bahasa Malaysia"],
      description: "For advertising rates and queries",
    },
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "admin@freemalaysiatoday.com",
      telephone: "+60378872888",
      availableLanguage: ["English", "Bahasa Malaysia"],
    },
    {
      "@type": "ContactPoint",
      contactType: "public engagement",
      email: "letters@freemalaysiatoday.com",
      availableLanguage: ["English", "Bahasa Malaysia"],
      description: "For letters to the editor and public submissions",
    },
    {
      "@type": "ContactPoint",
      contactType: "recruitment",
      email: "career@freemalaysiatoday.com",
      availableLanguage: ["English", "Bahasa Malaysia"],
      description: "For career opportunities at FMT",
    },
  ],

  areaServed: [
    // Primary Market
    { "@type": "Country", name: "Malaysia" },

    // Southeast Asia (ASEAN Countries)
    { "@type": "Country", name: "Singapore" },
    { "@type": "Country", name: "Indonesia" },
    { "@type": "Country", name: "Thailand" },
    { "@type": "Country", name: "Vietnam" },
    { "@type": "Country", name: "Philippines" },
    { "@type": "Country", name: "Brunei" },
    { "@type": "Country", name: "Myanmar" },
    { "@type": "Country", name: "Cambodia" },
    { "@type": "Country", name: "Laos" },

    // Major English-Speaking Markets
    { "@type": "Country", name: "United States" },
    { "@type": "Country", name: "United Kingdom" },
    { "@type": "Country", name: "Australia" },
    { "@type": "Country", name: "Canada" },
    { "@type": "Country", name: "New Zealand" },

    // Other Significant Markets
    { "@type": "Country", name: "India" },
    { "@type": "Country", name: "Hong Kong" },
    { "@type": "Country", name: "United Arab Emirates" },
  ],

  // ✅ NEW: E-E-A-T Policies (Critical for Google Trust Signals)
  publishingPrinciples: `${siteConfig.baseUrl}/about#editorial-policy`,
  ethicsPolicy: `${siteConfig.baseUrl}/about#ethics-standards`,
  correctionsPolicy: `${siteConfig.baseUrl}/about#corrections`,
  diversityPolicy: `${siteConfig.baseUrl}/about#diversity`,
  ownershipFundingInfo: `${siteConfig.baseUrl}/about#ownership`,

  // ✅ NEW: Founder information
  founder: {
    "@type": "Person",
    name: "Dato' Nelson Fernandez",
    jobTitle: "Executive Chairman & CEO",
    worksFor: {
      "@id": `${siteConfig.baseUrl}#organization`,
    },
  },

  knowsAbout: [
    "Malaysian Politics",
    "Southeast Asian News",
    "Business & Economy",
    "Technology",
    "Sports",
    "Lifestyle",
    "Entertainment",
    "International Affairs",
    "Breaking News",
    "Investigative Journalism",
  ],

  // ✅ NEW: Awards and achievements (E-E-A-T signals)
  award: [
    "Leading Independent News Portal in Malaysia",
    "22 Million Annual Users",
    "700,000+ Published Articles",
    "31,600+ Published Videos",
  ],

  // ✅ NEW: Detailed employee count
  numberOfEmployees: {
    "@type": "QuantitativeValue",
    value: 100,
    unitText: "employees",
  },
};
