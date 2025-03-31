// components/meta/CategoryMetadata.tsx
import Head from "next/head";
import { generatedJsonLd } from "@/constants/jsonlds/json-ld-generator";
import { WebPageJsonLD } from "@/constants/jsonlds/org";
import siteConfig from "@/constants/site-config";

interface MetadataConfig {
  title: string;
  description: string;
  keywords: string[];
  category: string;
  alternateLocale?: string[];
  pathName: string;
  author?: string;
  ogImage?: string;
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

export const CategoryMetadata = ({ config }: CategoryMetadataProps) => {
  const {
    title,
    description,
    keywords,
    category,
    alternateLocale = defaultAlternateLocale,
    pathName,
    author = "Free Malaysia Today (FMT)",
    ogImage = "https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg",
  } = config;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords?.join(", ")} />
      <meta name="author" content={author} />
      <meta name="category" content={category} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:site_name" content={title} />
      <meta property="og:locale" content="en_MY" />
      {alternateLocale.map((locale) => (
        <meta key={locale} property="og:locale:alternate" content={locale} />
      ))}
      <meta
        property="og:url"
        content={`https://${process.env.NEXT_PUBLIC_DOMAIN ?? "www.freemalaysiatoday.com"}${pathName}`}
      />

      {/* Twitter Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:site" content="@fmtoday" />
      <meta name="twitter:image" content={siteConfig.iconPath} />
      <meta
        name="twitter:image:alt"
        content="Latest News | Free Malaysia Today"
      />
      {/* Alternate Links */}
      <link
        rel="canonical"
        href={`https://www.freemalaysiatoday.com${pathName}`}
      />
      <link
        rel="alternate"
        type="application/atom+xml"
        href={`feeds/atom/${pathName.replace("/", "")}/`}
      />
      <link
        rel="alternate"
        type="application/rss+xml"
        href={`feeds/rss/${pathName.replace("/", "")}/`}
      />
      <link
        rel="alternate"
        type="application/feed+json"
        href={`feeds/json/${pathName.replace("/", "")}/`}
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
