export const lifestyleLandingTargetingParams = {
    pos: "listing",
    section: [
      "lifestyle",
      "landing-page",
      "lifestyle-landing-page",
      "simple-stories",
      "food",
      "entertainment",
      "health",
      "money",
      "travel",
      "tech",
      "pets"
    ],
    key: [
      // Simple Stories
      "human-interest",
      "inspirational-stories",
      "personal-experiences",
      "community-stories",
      "life-lessons",
      "everyday-heroes",
      "malaysian-life",
      "social-issues",
      "relationships",
      "career-stories",
  
      // Food
      "malaysian-food",
      "recipes",
      "restaurant-reviews",
      "cooking-tips",
      "food-culture",
      "street-food",
      "halal-food",
      "food-trends",
      "dining-out",
      "cooking-tutorials",
      "food-festivals",
      "traditional-cuisine",
      "healthy-eating",
      "food-safety",
  
      // Entertainment
      "movies",
      "music",
      "television",
      "streaming",
      "celebrity-news",
      "malaysian-entertainment",
      "bollywood",
      "k-drama",
      "k-pop",
      "hollywood",
      "local-artists",
      "concerts",
      "events",
      "theatre",
      "art-culture",
  
      // Health & Family
      "wellness",
      "fitness",
      "mental-health",
      "parenting",
      "family-life",
      "pregnancy",
      "childcare",
      "elderly-care",
      "nutrition",
      "medical-advice",
      "exercise",
      "healthcare",
      "disease-prevention",
      "women-health",
      "men-health",
  
      // Money
      "personal-finance",
      "savings",
      "investment",
      "budgeting",
      "retirement",
      "insurance",
      "debt-management",
      "money-tips",
      "financial-planning",
      "cost-of-living",
      "property-investment",
      "side-income",
      "consumer-rights",
  
      // Travel
      "domestic-travel",
      "international-travel",
      "travel-tips",
      "budget-travel",
      "luxury-travel",
      "hotels",
      "destinations",
      "adventure-travel",
      "food-tourism",
      "cultural-tourism",
      "travel-safety",
      "travel-insurance",
      "holiday-packages",
      "travel-technology",
  
      // Tech
      "gadgets",
      "smartphones",
      "laptops",
      "gaming",
      "apps",
      "social-media",
      "cybersecurity",
      "tech-reviews",
      "digital-lifestyle",
      "smart-home",
      "tech-trends",
      "software",
      "internet",
      "e-commerce",
  
      // Pets
      "pet-care",
      "dogs",
      "cats",
      "pet-health",
      "pet-training",
      "pet-products",
      "pet-adoption",
      "veterinary-care",
      "pet-food",
      "pet-grooming",
      "animal-welfare",
      "exotic-pets"
    ],
  
    // Additional targeting options
    contentType: "lifestyle",
    pageType: "category",
    language: "english",
    
    // Content format
    format: [
      "article",
      "feature",
      "review",
      "guide",
      "how-to",
      "list",
      "video",
      "interview",
      "opinion"
    ],
  
    // Audience segments
    audience: [
      "general",
      "families",
      "young-adults",
      "professionals",
      "seniors",
      "parents",
      "students"
    ],
  
    // Content characteristics
    characteristics: [
      "informative",
      "entertaining",
      "educational",
      "practical",
      "inspirational"
    ]
  };
  
  // Subcategory-specific targeting params
  export const simpleStoriesTargetingParams = {
    ...lifestyleLandingTargetingParams,
    section: ["lifestyle", "simple-stories"],
    key: [
      "human-interest",
      "inspirational-stories",
      "personal-experiences",
      "community-stories",
      "life-lessons",
      "everyday-heroes",
      "malaysian-life",
      "social-issues",
      "relationships",
      "career-stories"
    ]
  };
  
  export const foodTargetingParams = {
    ...lifestyleLandingTargetingParams,
    section: ["lifestyle", "food"],
    key: [
      "malaysian-food",
      "recipes",
      "restaurant-reviews",
      "cooking-tips",
      "food-culture",
      "street-food",
      "halal-food",
      "food-trends",
      "dining-out",
      "cooking-tutorials",
      "food-festivals",
      "traditional-cuisine",
      "healthy-eating",
      "food-safety"
    ]
  };
  
  export const entertainmentTargetingParams = {
    ...lifestyleLandingTargetingParams,
    section: ["lifestyle", "entertainment"],
    key: [
      "movies",
      "music",
      "television",
      "streaming",
      "celebrity-news",
      "malaysian-entertainment",
      "bollywood",
      "k-drama",
      "k-pop",
      "hollywood",
      "local-artists",
      "concerts",
      "events",
      "theatre",
      "art-culture"
    ]
  };
  
  export const healthTargetingParams = {
    ...lifestyleLandingTargetingParams,
    section: ["lifestyle", "health"],
    key: [
      "wellness",
      "fitness",
      "mental-health",
      "parenting",
      "family-life",
      "pregnancy",
      "childcare",
      "elderly-care",
      "nutrition",
      "medical-advice",
      "exercise",
      "healthcare",
      "disease-prevention",
      "women-health",
      "men-health"
    ]
  };
  
  export const moneyTargetingParams = {
    ...lifestyleLandingTargetingParams,
    section: ["lifestyle", "money"],
    key: [
      "personal-finance",
      "savings",
      "investment",
      "budgeting",
      "retirement",
      "insurance",
      "debt-management",
      "money-tips",
      "financial-planning",
      "cost-of-living",
      "property-investment",
      "side-income",
      "consumer-rights"
    ]
  };
  
  export const travelTargetingParams = {
    ...lifestyleLandingTargetingParams,
    section: ["lifestyle", "travel"],
    key: [
      "domestic-travel",
      "international-travel",
      "travel-tips",
      "budget-travel",
      "luxury-travel",
      "hotels",
      "destinations",
      "adventure-travel",
      "food-tourism",
      "cultural-tourism",
      "travel-safety",
      "travel-insurance",
      "holiday-packages",
      "travel-technology"
    ]
  };
  
  export const techTargetingParams = {
    ...lifestyleLandingTargetingParams,
    section: ["lifestyle", "tech"],
    key: [
      "gadgets",
      "smartphones",
      "laptops",
      "gaming",
      "apps",
      "social-media",
      "cybersecurity",
      "tech-reviews",
      "digital-lifestyle",
      "smart-home",
      "tech-trends",
      "software",
      "internet",
      "e-commerce"
    ]
  };
  
  export const petsTargetingParams = {
    ...lifestyleLandingTargetingParams,
    section: ["lifestyle", "pets"],
    key: [
      "pet-care",
      "dogs",
      "cats",
      "pet-health",
      "pet-training",
      "pet-products",
      "pet-adoption",
      "veterinary-care",
      "pet-food",
      "pet-grooming",
      "animal-welfare",
      "exotic-pets"
    ]
  };