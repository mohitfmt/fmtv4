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
  baseUrl: `https://${process.env.NEXT_PUBLIC_DOMAIN || "www.freemalaysiatoday.com"}`,
  nonCanonicalBaseUrl: "https://freemalaysiatoday.com",
  tagline: "Current Affairs, Business, Economy, Lifestyle, News and Analysis",
  siteDescription:
    "Free Malaysia Today is an independent, bi-lingual news portal with a focus on Malaysian current affairs, business, economy, lifestyle, news and analysis.",
  iconPath: "https://www.freemalaysiatoday.com/PreviewLinkImage.png",
};

export default siteConfig;
