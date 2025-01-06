// Main Opinion Landing Parameters
export const opinionLandingTargetingParams = {
  pos: "listing",
  section: [
    "opinion",
    "landing-page",
    "opinion-landing-page",
    "editorial",
    "column",
    "letters",
  ],
  key: [
    // General Opinion Topics
    "opinion-piece",
    "commentary",
    "analysis",
    "viewpoint",
    "perspective",
    "expert-opinion",
    "public-opinion",
    "thought-leadership",
    "current-affairs",
    "social-commentary",
    "political-analysis",
    "expert-analysis",
    "critical-thinking",
    "public-discourse",
    "debate",
    "discussion",
    "insight",
    "reflection",
  ],
  contentType: "opinion",
  pageType: "category",
  language: "english",
  contentFormat: ["analysis", "commentary", "opinion", "perspective"],
};

// Editorial Parameters
export const editorialParams = {
  ...opinionLandingTargetingParams,
  section: ["opinion", "editorial"],
  key: [
    // Editorial Focus
    "editorial-opinion",
    "editorial-stance",
    "newspaper-editorial",
    "editorial-board",
    "editorial-view",
    "editorial-commentary",
    "official-position",
    "institutional-view",

    // Editorial Topics
    "policy-analysis",
    "political-commentary",
    "social-issues",
    "governance",
    "public-interest",
    "national-issues",
    "current-events",
    "public-policy",

    // Editorial Style
    "balanced-view",
    "institutional-opinion",
    "editorial-analysis",
    "media-perspective",
    "newspaper-stance",
    "editorial-direction",
    "journalistic-opinion",
  ],
  contentType: "editorial",
  authorType: "editorial-board",
  content: {
    format: "editorial",
    style: "institutional",
    perspective: "organizational",
  },
};

// Column Parameters
export const columnParams = {
  ...opinionLandingTargetingParams,
  section: ["opinion", "column"],
  key: [
    // Column Types
    "regular-column",
    "expert-column",
    "guest-column",
    "opinion-column",
    "analytical-column",
    "specialist-view",
    "columnist-perspective",

    // Column Topics
    "politics",
    "economy",
    "society",
    "culture",
    "technology",
    "environment",
    "education",
    "healthcare",
    "international-affairs",
    "business-opinion",

    // Columnist Categories
    "expert-opinion",
    "professional-view",
    "industry-expert",
    "academic-perspective",
    "practitioner-view",
    "specialist-commentary",

    // Column Features
    "in-depth-analysis",
    "expert-insight",
    "professional-commentary",
    "specialized-knowledge",
    "industry-perspective",
  ],
  contentType: "column",
  authorType: ["columnist", "expert", "guest-writer", "specialist"],
  content: {
    format: "column",
    style: "personal-professional",
    perspective: "expert",
  },
};

// Letters Parameters
export const lettersParams = {
  ...opinionLandingTargetingParams,
  section: ["opinion", "letters"],
  key: [
    // Letter Types
    "letters-to-editor",
    "reader-opinion",
    "public-feedback",
    "reader-response",
    "community-voice",
    "public-view",
    "citizen-opinion",

    // Letter Topics
    "public-issues",
    "community-concerns",
    "social-matters",
    "local-issues",
    "reader-concerns",
    "public-grievances",
    "citizen-feedback",
    "community-matters",

    // Reader Engagement
    "public-discussion",
    "reader-engagement",
    "community-dialogue",
    "public-debate",
    "citizen-participation",
    "reader-contribution",
    "public-forum",

    // Response Categories
    "policy-response",
    "news-response",
    "article-response",
    "issue-discussion",
    "public-suggestion",
    "community-feedback",
  ],
  contentType: "letters",
  authorType: ["reader", "public", "citizen", "community-member"],
  content: {
    format: "letter",
    style: "public",
    perspective: "reader",
  },
  engagement: {
    type: "reader-submitted",
    interaction: "public-response",
    participation: "community",
  },
};
