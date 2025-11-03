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
      jobTitle: "Executive Chairman/CEO",
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
      sameAs: [
        "https://www.linkedin.com/in/azeem-abu-bakar-a6067b30/",
        "https://www.instagram.com/azeem360/",
        "https://x.com/azeem360",
      ],
    },
    {
      "@type": "Person",
      name: "Jenn Ngan",
      jobTitle: "Chief Operating Officer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: [
        "https://www.linkedin.com/in/jennngan/",
        "https://www.instagram.com/jenn.ngan/",
        "https://www.tiktok.com/@jennngan",
        "https://www.facebook.com/jenn.ngan.2025/",
      ],
    },
    {
      "@type": "Person",
      name: "Amir Razman",
      jobTitle: "Chief Financial Officer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/amir-razman-462b29206/"],
    },
    {
      "@type": "Person",
      name: "Shahnon Azeem",
      jobTitle: "Special Officer to CEO & COO",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/shahnon-azeem-6b2b85247/"],
    },
    {
      "@type": "Person",
      name: "Paul Richard",
      jobTitle: "Human Resources Manager",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/paulrichard2025/"],
    },
    {
      "@type": "Person",
      name: "Aisyah Azmi",
      jobTitle: "Senior Finance Executive",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Saereen Francies",
      jobTitle: "Human Resources Executive",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Shahrul Hisham",
      jobTitle: "Finance & Admin Executive",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Yunus Abd Rani",
      jobTitle: "Company Driver",
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

    // English Desk - Executive Editors
    {
      "@type": "Person",
      name: "Clement Lopez",
      jobTitle: "Executive Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "A. Kathiresan",
      jobTitle: "Executive Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "K. Parkaran",
      jobTitle: "Executive Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // English Desk - Chief News Editors
    {
      "@type": "Person",
      name: "Sean Augustin",
      jobTitle: "Chief News Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Nicholas Chung",
      jobTitle: "Chief News Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/nicholas-chung-53ab501b1/"],
    },

    // English Desk - News Editors
    {
      "@type": "Person",
      name: "'Ainin Wan Salleh",
      jobTitle: "News Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Mikha Chan",
      jobTitle: "News Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/mikha-chan-97149834/"],
    },
    {
      "@type": "Person",
      name: "Jason Thomas",
      jobTitle: "News Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/jason-t-ba2262164/"],
    },

    // English Desk - Other Editors
    {
      "@type": "Person",
      name: "Lee Min Keong",
      jobTitle: "Business Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Lynelle Tham",
      jobTitle: "Assistant News Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/lynelletham/"],
    },
    {
      "@type": "Person",
      name: "Yasodha",
      jobTitle: "Editorial Coordinator",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Afiqah Laili",
      jobTitle: "Chief Copy Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Predeep Nambiar",
      jobTitle: "Northern Bureau Chief",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: [
        "https://x.com/predeepnambiar",
        "https://www.instagram.com/predeepatwork/",
        "https://www.linkedin.com/in/predeepn/",
      ],
    },
    {
      "@type": "Person",
      name: "K.Anandaraja",
      jobTitle: "Copy Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // English Desk - Lead Writers
    {
      "@type": "Person",
      name: "V. Anbalagan",
      jobTitle: "Lead Writer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Yeoh Guan Jin",
      jobTitle: "Lead Writer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/guan-jin-yeoh-795a01236/"],
    },

    // English Desk - Sub-Editors
    {
      "@type": "Person",
      name: "Michelle Chen",
      jobTitle: "Sub-Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/michelle-chen-3607031ab/"],
    },
    {
      "@type": "Person",
      name: "Patrick Choo",
      jobTitle: "Sub-Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Vijiyan Nambiar",
      jobTitle: "Sub-Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Anandha Vale",
      jobTitle: "Sub-Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Chan Cheng Tuan",
      jobTitle: "Sub-Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // English Desk - Senior Journalist
    {
      "@type": "Person",
      name: "Minderjeet Kaur",
      jobTitle: "Senior Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // English Desk - Journalists
    {
      "@type": "Person",
      name: "Elill Easwaran",
      jobTitle: "Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/elill-easwaran-4a4389180/"],
    },
    {
      "@type": "Person",
      name: "Rex Tan",
      jobTitle: "Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Ho Kit Yen",
      jobTitle: "Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Faisal Asyraf",
      jobTitle: "Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Pan Eu Joe",
      jobTitle: "Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/eu-joe-pan-70412b156/"],
    },

    // BM Desk - Editors
    {
      "@type": "Person",
      name: "Amin Ridzuan",
      jobTitle: "BM Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Mohd Hafiizh",
      jobTitle: "BM Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Mohd Fauzi",
      jobTitle: "BM Deputy Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/mohd-fauzi-abdullah-17b6321aa/"],
    },

    // BM Desk - Sub-Editors
    {
      "@type": "Person",
      name: "Mas Ainun",
      jobTitle: "Sub-Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Siti Fatimah",
      jobTitle: "Sub-Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Teh Kean Kiat",
      jobTitle: "Sub-Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Amirul Faiz",
      jobTitle: "Sub-Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Syed Ahmad",
      jobTitle: "Sub-Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // BM Desk - Senior Journalist
    {
      "@type": "Person",
      name: "Nasriah Muhammad",
      jobTitle: "Senior Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // BM Desk - Journalists
    {
      "@type": "Person",
      name: "Mohamad Fadhli",
      jobTitle: "Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Raja Mohamad Faiz",
      jobTitle: "Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Chia Wan Rou",
      jobTitle: "Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Nora Mahpar",
      jobTitle: "Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // Wires Desk - Sub-Editors
    {
      "@type": "Person",
      name: "Shyla Sangaran",
      jobTitle: "Sub-Editor - Wires Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Izhar Shazly",
      jobTitle: "Sub-Editor - Wires Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Faiz Adnan",
      jobTitle: "Sub-Editor - Wires Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/faiz-adnan-aa474160/"],
    },
    {
      "@type": "Person",
      name: "Shirin Rekabdar – Xavier",
      jobTitle: "Sub-Editor - Wires Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Shazie Zaini",
      jobTitle: "Sub-Editor - Wires Desk",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // Lifestyle Desk
    {
      "@type": "Person",
      name: "Sandra John",
      jobTitle: "Executive Editor - Lifestyle",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Nick Choo",
      jobTitle: "Head of Lifestyle",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/nick-choo-37872714/"],
    },
    {
      "@type": "Person",
      name: "Terence Toh",
      jobTitle: "Senior Journalist - Lifestyle",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Theevya Ragu",
      jobTitle: "Journalist - Lifestyle",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/theevya-ragu/"],
    },
    {
      "@type": "Person",
      name: "Sheela Vijayan",
      jobTitle: "Journalist - Lifestyle",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Dinesh Kumar",
      jobTitle: "Journalist - Lifestyle",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // Broadcast Desk
    {
      "@type": "Person",
      name: "Raja Mohd Danish",
      jobTitle: "Broadcast Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/danishrajareza/"],
    },
    {
      "@type": "Person",
      name: "Natasha Busst",
      jobTitle: "Broadcast Journalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: [
        "https://www.linkedin.com/in/natasha-muhammad-azman-busst-b34725232/",
      ],
    },

    // Video Unit
    {
      "@type": "Person",
      name: "Zahrul Alam Yahya Shahir",
      jobTitle: "Head of Bahasa Malaysia & Video Unit",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Dinesh Pushparani",
      jobTitle: "Video Director",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Khairul Taufiek",
      jobTitle: "Senior Videographer/Visual Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Muhammad Akif Irfan",
      jobTitle: "Video Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Hemaviknesh",
      jobTitle: "Video Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Fathul Ilham",
      jobTitle: "Video Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/fathul-illham-3409361b5/"],
    },
    {
      "@type": "Person",
      name: "Nor Shaqira",
      jobTitle: "Video Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Maheshan",
      jobTitle: "Video Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Ahmad Nujaid",
      jobTitle: "Video Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Syaiful Adly",
      jobTitle: "Video Editor",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Moganraj Villavan",
      jobTitle: "Photojournalist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: [
        "https://www.instagram.com/moganraja/",
        "https://www.linkedin.com/in/moganrajvillavan/",
        "https://www.facebook.com/moganrajvillavan/",
        "https://www.moganraj.com/",
      ],
    },
    {
      "@type": "Person",
      name: "Mohd Afizi",
      jobTitle: "Videographer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Muhammad Fauzi",
      jobTitle: "Videographer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Muhammad Rabbani",
      jobTitle: "Videographer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Hizami Safri",
      jobTitle: "Videographer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Andrea Edmonds",
      jobTitle: "Videographer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/andrearhiannonedmonds/"],
    },
    {
      "@type": "Person",
      name: "Hyeley Izzati",
      jobTitle: "Presenter & Client Affairs",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Zeanaaima Mohd Yusof",
      jobTitle: "Senior Journalist - Video",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Yasmin Latif",
      jobTitle: "Journalist - Video",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/yasmin-latif-168769170/"],
    },
    {
      "@type": "Person",
      name: "Azureen Zainal",
      jobTitle: "Journalist - Video",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // Uploaders Unit
    {
      "@type": "Person",
      name: "Nadia Masturah",
      jobTitle: "Team Leader – Graphic Designer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Muhammad Izzat",
      jobTitle: "Deputy Team Leader - Uploaders",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/muhammad-izzat-ali-0b4409258/"],
    },
    {
      "@type": "Person",
      name: "Siti Nur Syamimi",
      jobTitle: "Graphic Designer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Nor Ain Nabilah",
      jobTitle: "Graphic Designer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Zaira Marlia",
      jobTitle: "Graphic Designer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Nurul Amalina",
      jobTitle: "Graphic Designer",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // Social Media Unit
    {
      "@type": "Person",
      name: "Shalini Rajendran",
      jobTitle: "Social Media Specialist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/shalini-rajendran-477640105/"],
    },
    {
      "@type": "Person",
      name: "Radin Naurahkamar",
      jobTitle: "Social Media Executive",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/radinnaurahkamar/"],
    },
    {
      "@type": "Person",
      name: "Santhiavathi",
      jobTitle: "Social Media Executive",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Nurfarhana Yasmin",
      jobTitle: "Social Media Executive",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },

    // Business Development Unit
    {
      "@type": "Person",
      name: "Aisha Rafiqa",
      jobTitle: "Strategic Communications and Partnership, Lead",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Selven Razz",
      jobTitle: "Head of Content Strategy",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/selven-razz-60a441114/"],
    },
    {
      "@type": "Person",
      name: "Kishwannath Gunasagaran",
      jobTitle: "Campaign Specialist",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: [
        "https://www.linkedin.com/in/kishwannath-gunasagaran-3181a0242/",
      ],
    },
    {
      "@type": "Person",
      name: "Sharafina",
      jobTitle: "Business Development Executive",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
      sameAs: ["https://www.linkedin.com/in/sharafinashaifulizam/"],
    },
    {
      "@type": "Person",
      name: "Lauren Lopez",
      jobTitle: "Strategic Communications Analyst",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Siti Khadijah",
      jobTitle: "Project Executive",
      worksFor: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@type": "Person",
      name: "Edrina Lisa",
      jobTitle: "Project Executive",
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
