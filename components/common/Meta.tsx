// components/common/Meta.tsx
import siteConfig from "@/constants/site-config";
import { NextSeo } from "next-seo";

interface MetaProps {
  title: string;
  description: string;
  canonical?: string;
  imageUrl?: string;
}

const Meta = ({
  title,
  description,
  canonical,
  imageUrl = siteConfig.iconPath ||
    "https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg",
}: MetaProps) => {
  const fullCanonical = canonical
    ? `https://www.freemalaysiatoday.com/${canonical.replace(/^\/|\/$/g, "")}/`
    : "https://www.freemalaysiatoday.com/";

  return (
    <NextSeo
      title={title}
      description={description}
      canonical={fullCanonical}
      openGraph={{
        url: fullCanonical,
        type: "website",
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        siteName: "Free Malaysia Today",
      }}
      twitter={{
        handle: "@fmtoday",
        site: "@fmtoday",
        cardType: "summary_large_image",
      }}
    />
  );
};

export default Meta;
