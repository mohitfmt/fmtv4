// Main News Landing Parameters
export const newsLandingTargetingParams = {
    pos: "listing",
    section: [
      "news",
      "landing-page",
      "news-landing-page",
      "nation",
      "sabahsarawak",
      "south-east-asia",
      "world"
    ],
    key: [
      // General News Topics
      "breaking-news",
      "top-stories",
      "latest-news",
      "current-events",
      "investigative",
      "special-report",
  
      // Common News Categories
      "politics",
      "economy",
      "business",
      "technology",
      "environment",
      "climate-change",
      "education",
      "health",
      "crime",
      "courts",
      "parliament",
      "government",
      "policy",
      "diplomacy",
      "trade",
      "immigration",
      "infrastructure",
      "transport",
      "agriculture",
      "defense",
      "security"
    ],
    contentType: "news",
    pageType: "category",
    region: ["malaysia", "south-east-asia", "international"],
    language: "english"
  };
  
  // Malaysia News Parameters
  export const malaysiaNationalNewsParams = {
    ...newsLandingTargetingParams,
    section: ["news", "nation"],
    key: [
      "malaysia-news",
      "malaysian-politics",
      "malaysian-economy",
      "malaysian-society",
      "national-politics",
      "federal-government",
      "parliament",
      "cabinet",
      "opposition",
      "elections",
      "national-security",
      "public-policy",
      "national-economy",
      "federal-law",
      "constitution",
      "royal-news",
      "public-service",
      "national-education",
      "healthcare-policy",
      "defense",
      "foreign-relations",
      "national-development",
      "social-issues",
      "unity-issues"
    ],
    region: ["malaysia"],
    coverage: ["national", "federal"]
  };
  
  // Borneo+ News Parameters
  export const borneoNewsParams = {
    ...newsLandingTargetingParams,
    section: ["news", "sabahsarawak"],
    key: [
      "sabah",
      "sarawak",
      "labuan",
      "borneo-news",
      "brunei",
      "kalimantan",
      "east-malaysia-development",
      "east-malaysia-politics",
      "ma63",
      "borneo-rights",
      "borneo-economy",
      "sabah-tourism",
      "sarawak-tourism",
      "native-rights",
      "borneo-environment",
      "borneo-wildlife",
      "borneo-culture",
      "borneo-trade",
      "heart-of-borneo",
      "cross-border-issues",
      "maritime-security",
      "indigenous-rights"
    ],
    region: ["borneo", "east-malaysia"],
    coverage: ["regional", "state"]
  };
  
  // South East Asia News Parameters
  export const southEastAsiaNewsParams = {
    ...newsLandingTargetingParams,
    section: ["news", "south-east-asia"],
    key: [
      "asean",
      "singapore",
      "indonesia",
      "thailand",
      "philippines",
      "vietnam",
      "myanmar",
      "cambodia",
      "laos",
      "timor-leste",
      "brunei",
      "regional-politics",
      "regional-economy",
      "regional-security",
      "asean-cooperation",
      "regional-trade",
      "south-china-sea",
      "maritime-issues",
      "regional-development",
      "regional-diplomacy",
      "asean-summit",
      "regional-conflicts",
      "regional-cooperation",
      "mekong-region",
      "cross-border-relations"
    ],
    region: ["south-east-asia"],
    coverage: ["regional", "international"]
  };
  
  // World News Parameters
  export const worldNewsParams = {
    ...newsLandingTargetingParams,
    section: ["news", "world"],
    key: [
      // Regions
      "asia-pacific",
      "middle-east",
      "europe",
      "north-america",
      "south-america",
      "africa",
      "oceania",
      
      // Major Countries/Regions
      "china",
      "united-states",
      "european-union",
      "russia",
      "india",
      "japan",
      "australia",
      "middle-east",
      "united-kingdom",
      
      // Global Issues
      "international-relations",
      "global-economy",
      "global-politics",
      "international-trade",
      "global-security",
      "climate-crisis",
      "human-rights",
      "terrorism",
      "cybersecurity",
      "global-health",
      "migration",
      "united-nations",
      "global-conflicts",
      "nuclear-issues",
      "international-aid"
    ],
    region: ["international"],
    coverage: ["global", "international"],
    contentType: ["world-news", "international-affairs"]
  };