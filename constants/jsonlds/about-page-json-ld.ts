// constants/jsonlds/about-page-json-ld.ts

import siteConfig from "@/constants/site-config";
import {
  getFullOrganization,
  getWebsiteSchema,
  generateBreadcrumbSchema,
} from "./shared-schemas";

/**
 * Generate comprehensive AboutPage JSON-LD with team members and FAQs
 * Uses shared-schemas for organization, website, and breadcrumb to avoid duplication
 */
export const generateAboutPageJsonLD = () => {
  const baseUrl = siteConfig.baseUrl;

  // Team Members Array (kept separate - about page specific)
  const teamMembers = [
    // Executive Leadership
    {
      "@type": "Person",
      name: "Dato' Nelson Fernandez",
      jobTitle: "Executive Chairman & CEO",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Azeem Abu Bakar",
      jobTitle: "Managing Director",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Jenn Ngan",
      jobTitle: "Chief Operating Officer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Amir Razman",
      jobTitle: "Chief Financial Officer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // English Desk - Executive Editors
    {
      "@type": "Person",
      name: "Clement Lopez",
      jobTitle: "Executive Editor - English Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Kalbana Perimbanayagam",
      jobTitle: "Executive Editor - English Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // English Desk - Chief News Editors
    {
      "@type": "Person",
      name: "Frank Fernandez",
      jobTitle: "Chief News Editor - English Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Melan Raj",
      jobTitle: "Chief News Editor - English Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // English Desk - Copy Editors
    {
      "@type": "Person",
      name: "Subhash Somiah",
      jobTitle: "Copy Editor - English Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Bhagwan Singh",
      jobTitle: "Copy Editor - English Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Dennis Yin",
      jobTitle: "Copy Editor - English Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Ashwin Kumar",
      jobTitle: "Copy Editor - English Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Praba Balasingam",
      jobTitle: "Copy Editor - English Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // BM Desk - Executive Editors
    {
      "@type": "Person",
      name: "Mutalib M.D.",
      jobTitle: "Executive Editor - BM Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // BM Desk - Chief News Editors
    {
      "@type": "Person",
      name: "Abdul Jalil Hamid",
      jobTitle: "Chief News Editor - BM Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Lokman Mansor",
      jobTitle: "Chief News Editor - BM Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Mohd Farhan Darwis",
      jobTitle: "Chief News Editor - BM Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // BM Desk - Copy Editors
    {
      "@type": "Person",
      name: "Mohd Amin Jalil",
      jobTitle: "Copy Editor - BM Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Luqman Hariz",
      jobTitle: "Copy Editor - BM Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Ikhwan Yusof",
      jobTitle: "Copy Editor - BM Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // Lifestyle Desk
    {
      "@type": "Person",
      name: "Priyanka Elhence",
      jobTitle: "Editor - Lifestyle",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Rosli Mansor",
      jobTitle: "Reporter - Lifestyle",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Farezza Hanum Rashid",
      jobTitle: "Reporter - Lifestyle",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // Video Department
    {
      "@type": "Person",
      name: "Mark Raj",
      jobTitle: "Head of Video Production",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Subramaniam Pillay",
      jobTitle: "Video Producer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Albert Tan",
      jobTitle: "Video Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Muhammad Amin",
      jobTitle: "Videographer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // Business & Technology
    {
      "@type": "Person",
      name: "Rachel Hussey",
      jobTitle: "Senior Reporter - Business",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Mohit Shrivastava",
      jobTitle: "Head of Information Technology",
      email: "mohit@freemalaysiatoday.com",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: [
        "https://www.linkedin.com/in/iamohit/",
        "https://github.com/iam-rohid",
        "https://twitter.com/iamohitdotcom",
        "https://www.facebook.com/iiamohit",
        "https://www.instagram.com/iamohit.in/",
        "https://www.youtube.com/@iamohit",
        "https://in.pinterest.com/iiamohit/",
        "https://iamohit.com/",
      ],
    },

    // Northern Bureau
    {
      "@type": "Person",
      name: "V Anbalagan",
      jobTitle: "Chief - Northern Bureau",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Opalyn Mok",
      jobTitle: "Reporter - Northern Bureau",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
  ];

  // Get full organization with employee array added
  const fullOrganization = {
    ...getFullOrganization(),
    employee: teamMembers, // Add team members to organization
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      // 1. Enhanced NewsMediaOrganization Schema (from shared helper + team members)
      fullOrganization,

      // 2. WebSite Schema (from shared helper)
      getWebsiteSchema(),

      // 3. Breadcrumb Schema (from shared helper)
      generateBreadcrumbSchema([
        { name: "Home", url: baseUrl },
        { name: "About Us", url: `${baseUrl}/about` },
      ]),

      // 4. FAQPage Schema - CRITICAL FOR RICH SNIPPETS
      {
        "@type": "FAQPage",
        "@id": `${baseUrl}/about#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Free Malaysia Today?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Free Malaysia Today (FMT) is Malaysia's leading independent online news portal, providing comprehensive coverage of politics, business, lifestyle, and sports since 2009. We serve over 22 million annual users and 2.3 million monthly active users with accurate, unbiased bilingual reporting in English and Bahasa Malaysia.",
            },
          },
          {
            "@type": "Question",
            name: "Is Free Malaysia Today a print newspaper?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No, Free Malaysia Today is a digital-only news organization. We focus exclusively on online journalism to provide fast, accessible, and comprehensive news coverage to readers across Malaysia and internationally through our website, mobile apps, and social media platforms.",
            },
          },
          {
            "@type": "Question",
            name: "What is FMT's editorial stance and political position?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FMT maintains strict editorial independence and political neutrality. We practice objective journalism by reporting facts as they are, quoting sources accurately without editorial opinion or bias. We believe readers should make their own judgments based on raw, unfiltered information. Our mission is to deliver news with objectivity – the missing dimension in today's news scene.",
            },
          },
          {
            "@type": "Question",
            name: "How can I contact FMT's editorial team?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "For editorial queries and news tips, email editor@freemalaysiatoday.com. For letters to the editor and public submissions, email letters@freemalaysiatoday.com. For general inquiries, contact admin@freemalaysiatoday.com or call +603 7887 2888.",
            },
          },
          {
            "@type": "Question",
            name: "What languages does FMT publish in?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FMT publishes news in both English and Bahasa Malaysia, ensuring comprehensive bilingual coverage for all Malaysians. We have dedicated editorial teams for each language, with specialized sections including English Desk, BM Desk, and Lifestyle content in both languages.",
            },
          },
          {
            "@type": "Question",
            name: "How can I advertise with FMT?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "For advertising rates, media kits, and partnership opportunities, please contact our advertising team at advertise@freemalaysiatoday.com. We offer various digital advertising solutions including display ads, sponsored content, native advertising, and video advertising across our platforms reaching 22M+ annual users.",
            },
          },
          {
            "@type": "Question",
            name: "How do I submit a news tip or story to FMT?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "We welcome news tips and story ideas from the public. Email your tips to editor@freemalaysiatoday.com. For letters to the editor or opinion submissions, email letters@freemalaysiatoday.com. All submissions will be reviewed by our editorial team.",
            },
          },
          {
            "@type": "Question",
            name: "How can I work at Free Malaysia Today?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "We're always looking for talented journalists, editors, videographers, and digital media professionals. Send your CV and cover letter to career@freemalaysiatoday.com. Visit our careers page for current openings and learn about life at FMT's newsroom in Petaling Jaya.",
            },
          },
          {
            "@type": "Question",
            name: "What is FMT's reach and audience size?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FMT reaches 22 million active users annually, with 2.3 million monthly active users and 184,000 daily active users. We have published over 696,000 articles and 31,000 videos since 2009. Our content reaches readers in Malaysia (73% of traffic), Singapore, United States, Vietnam, Australia, United Kingdom, and India. Our social media platforms have a combined following of 3.28 million across Facebook, Twitter, Instagram, YouTube, TikTok, and Telegram.",
            },
          },
          {
            "@type": "Question",
            name: "Where is FMT headquartered?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FMT's headquarters and newsroom are located at The West Wing, Menara Axis, Ground Floor, Quattro West, 4, Persiaran Barat, Petaling Jaya, Selangor 46200, Malaysia. We also operate a Northern Bureau for regional coverage.",
            },
          },
          {
            "@type": "Question",
            name: "What content partnerships does FMT have?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FMT partners with leading international and regional news agencies including Agence France-Presse (AFP), Reuters, Bernama (Malaysian National News Agency), and EXT Daily. These partnerships enable us to provide comprehensive local and international news coverage to our readers.",
            },
          },
          {
            "@type": "Question",
            name: "How does FMT ensure journalistic integrity and accuracy?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FMT maintains strict editorial standards including fact-checking protocols, transparent corrections policy, and editorial independence from commercial interests. Our newsroom has dedicated Copy Editors, Chief News Editors, and Executive Editors who ensure accuracy and fairness in all our reporting. We are committed to staying true to objectivity – the missing dimension in today's news scene.",
            },
          },
        ],
      },
    ],
  };
};
