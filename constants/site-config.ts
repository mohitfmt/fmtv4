interface SiteConfig {
  siteName: string;
  siteShortName: string;
  baseUrl: string;
  nonCanonicalBaseUrl?: string;
  tagline: string;
  siteDescription: string;
  iconPath?: string;
}

const siteConfig: SiteConfig = {
  siteName: "Free Malaysia Today",
  siteShortName: "FMT",
  baseUrl:
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.freemalaysiatoday.com",
  nonCanonicalBaseUrl: "https://freemalaysiatoday.com",
  tagline: "Current Affairs, Business, Economy, Lifestyle, News and Analysis",
  siteDescription:
    "Free Malaysia Today is an independent, bi-lingual news portal with a focus on Malaysian current affairs, business, economy, lifestyle, news and analysis.",
  iconPath: "/icon-512x512.png",
};

export const getIconUrl = () => `${siteConfig.baseUrl}${siteConfig.iconPath}`;

export default siteConfig;
