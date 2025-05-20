import React from "react";
import Link from "next/link";
import { social } from "@/constants/social";
import Head from "next/head";
import { socialChannelsJsonLD, websiteJSONLD } from "@/constants/jsonlds/org";

interface SocialIconsProps {
  className?: string;
  iconClassName?: string;
  useColors?: boolean;
  iconSize?: number;
}

const Channels: React.FC<SocialIconsProps> = ({
  className = "",
  iconClassName = "",
  useColors = false,
  iconSize = 1,
}) => {
  return (
    <>
      <Head>
        <title>Social Media Channels | Free Malaysia Today (FMT)</title>
        <meta
          name="description"
          content="Follow Free Malaysia Today on all official social platforms including Facebook, Instagram, X (Twitter), YouTube, WhatsApp, Telegram, and more."
        />
        <meta
          name="keywords"
          content="FMT social media, Free Malaysia Today Facebook, YouTube, X, Instagram, LinkedIn, TikTok, Telegram, WhatsApp, Wikipedia, Google News"
        />
        <meta name="robots" content="index, follow" />
        <link
          rel="canonical"
          href="https://www.freemalaysiatoday.com/channels"
        />

        <meta
          property="og:title"
          content="Official Social Media Channels | Free Malaysia Today"
        />
        <meta
          property="og:description"
          content="Connect with FMT across Facebook, Instagram, YouTube, X, LinkedIn, and more for trusted news updates."
        />
        <meta
          property="og:url"
          content="https://www.freemalaysiatoday.com/channels"
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Follow Free Malaysia Today on Social Media"
        />
        <meta
          name="twitter:description"
          content="Explore our official channels and stay up-to-date on the latest news and features from FMT."
        />
        <meta
          name="twitter:image"
          content="https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg"
        />
      </Head>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(socialChannelsJsonLD),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJSONLD) }}
        type="application/ld+json"
        async
        // defer
      />
      <div>
        <h1 className="mt-4 mb-8 text-center text-4xl font-extrabold">
          Channels
        </h1>
        <nav
          className={`mt-8 flex flex-row flex-wrap justify-center items-center gap-4 ${className}`}
        >
          {social.map(({ name, url, icon: Icon, color, size }) => (
            <Link
              key={name}
              href={url}
              title={name}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center gap-2 p-4 transition-transform hover:scale-110 focus:outline-none focus:ring-2 ${iconClassName}`}
            >
              <Icon
                size={iconSize * 50}
                color={useColors ? color : "currentColor"}
                className="mb-1"
              />
              <span className="text-sm font-medium">{name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Channels;
