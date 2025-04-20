// components/meta/CategoryMetadata.tsx
import Head from "next/head";
import { generatedJsonLd } from "@/constants/jsonlds/json-ld-generator";
import { WebPageJsonLD } from "@/constants/jsonlds/org";
import siteConfig from "@/constants/site-config";
import { fbPageIds } from "@/constants/social";

interface MetadataConfig {
  title: string;
  description: string;
  keywords: string[];
  category: string;
  pathName: string;
  imageAlt: string;
}

interface CategoryMetadataProps {
  config: MetadataConfig;
}

const defaultAlternateLocale = [
  "en_US",
  "en_GB",
  "en_AU",
  "en_CA",
  "en_NZ",
  "en_IE",
  "en_IN",
  "en_SG",
  "en_ZA",
  "en_PH",
  "en_HK",
  "en_PK",
];

const BeritaAlternateLocale = ["id_ID", "jv_ID", "su_ID", "ms_BN", "ms_SG"];

export const CategoryMetadata = ({ config }: CategoryMetadataProps) => {
  const { title, description, keywords, category, pathName, imageAlt } = config;

  const locale = pathName === "/berita" ? "ms_MY" : "en_MY";

  const alternateLocale =
    pathName === "/berita" ? BeritaAlternateLocale : defaultAlternateLocale;

  const feedPath =
    pathName === "/news" ? "headlines" : pathName.replace("/", "");

  let fbPageId: string;

  switch (pathName) {
    case "/berita":
      fbPageId = fbPageIds[2]; // Berita FMT
      break;
    case "/lifestyle":
      fbPageId = fbPageIds[1]; // Lifestyle FMT
      break;
    default:
      fbPageId = fbPageIds[0]; // Main FMT
      break;
  }

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords?.join(", ")} />
      <meta name="author" content={siteConfig.siteName} />
      <meta name="category" content={category} />
      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={siteConfig.iconPath} />
      <meta property="og:image:secure_url" content={siteConfig.iconPath} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:site_name" content={siteConfig.siteName} />
      <meta property="og:locale" content={locale} />

      <meta property="fb:pages" content={fbPageId} />

      {alternateLocale?.map((locale: any) => (
        <meta key={locale} property="og:locale:alternate" content={locale} />
      ))}
      <meta property="og:url" content={siteConfig.baseUrl + pathName} />

      {/* Twitter Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:site" content="@fmtoday" />
      <meta name="twitter:image" content={siteConfig.iconPath} />
      <meta name="twitter:image:secure_url" content={siteConfig.iconPath} />
      <meta name="twitter:image:alt" content={imageAlt} />
      <meta name="publisher" content={siteConfig.siteName} />
      {/* Alternate Links */}
      <link
        rel="canonical"
        href={`${siteConfig.baseUrl}/${pathName.replace("/", "")}/`}
      />
      <link
        rel="alternate"
        type="application/atom+xml"
        href={`${siteConfig.baseUrl}/feeds/atom/${feedPath}/`}
      />
      <link
        rel="alternate"
        type="application/rss+xml"
        href={`${siteConfig.baseUrl}/feeds/rss/${feedPath}/`}
      />
      <link
        rel="alternate"
        type="application/feed+json"
        href={`${siteConfig.baseUrl}/feeds/json/${feedPath}/`}
      />
    </Head>
  );
};

// components/meta/CategoryJsonLD.tsx
interface JsonLDProps {
  posts: any;
  pathName: string;
  title: string;
}

export const CategoryJsonLD = ({ posts, pathName, title }: JsonLDProps) => {
  const jsonLD = generatedJsonLd(
    posts?.edges || [],
    `https://${process.env.NEXT_PUBLIC_DOMAIN ?? "www.freemalaysiatoday.com"}${pathName}`,
    title
  );

  return (
    <section>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WebPageJsonLD) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLD),
        }}
        type="application/ld+json"
      />
    </section>
  );
};

// constants/categoryMetadata.ts
