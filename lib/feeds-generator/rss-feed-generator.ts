import { addHours, format } from "date-fns";

export const dynamic = "force-dynamic";

export const updateRSSFeed = (
  feed: string,
  rssSpecifics: {
    category: string;
    title: string;
    atomLink: string;
    fullPath: string;
  }
) => {
  let updatedFeed = feed
    .replace(
      'xmlns:slash="http://purl.org/rss/1.0/modules/slash/"',
      'xmlns:slash="http://purl.org/rss/1.0/modules/slash/" xmlns:media="http://search.yahoo.com/mrss/"'
    )
    .replace(/&/g, " ")
    .replace(
      /<description>(.*?)<\/description>/g,
      "<description>Explore 24/7 news on politics, economy, and more with Free Malaysia Today. Your source for unbiased Malaysian news in English / Malay since 2009.</description>"
    )
    .replace(
      /<sy:updatePeriod>[\s\S]*?<\/sy:updatePeriod>/g,
      rssSpecifics?.category
    )
    .replace(/<sy:updateFrequency>[\s\S]*?<\/sy:updateFrequency>/g, "")
    .replace(
      /<generator>(.*?)<\/generator>/g,
      `<ttl>20</ttl>
        <image>
            <url>https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg</url>
            ${rssSpecifics?.title}
            <link>https://www.freemalaysiatoday.com</link>
        </image>`
    )
    .replace(/<link>(.*?)<\/link>/g, rssSpecifics?.fullPath)
    .replace(/<lastBuildDate>(.*?)<\/lastBuildDate>/g, () => {
      const linkMatch = feed.match(/<lastBuildDate>(.*?)<\/lastBuildDate>/);
      return `<lastBuildDate>${
        linkMatch
          ? linkMatch[1].replace("+0000", "GMT")
          : format(addHours(new Date(), -8), "EEE, dd MMM yyyy HH:mm:ss 'GMT'")
      }</lastBuildDate>
        <pubDate>${
          linkMatch
            ? linkMatch[1].replace("+0000", "GMT")
            : format(
                addHours(new Date(), -8),
                "EEE, dd MMM yyyy HH:mm:ss 'GMT'"
              )
        }</pubDate>`;
    })
    .replace(
      /<title>(.*?Free Malaysia Today.*?)<\/title>/g,
      rssSpecifics?.title
    )
    .replace(/<atom:link\s+[^>]*\/?>/g, rssSpecifics?.atomLink);

  const itemMatches = feed.match(/<item>[\s\S]*?<\/item>/g) || [];

  const processedItems = itemMatches?.map((item: string) => {
    return processItem(item.replace(/&#\d{4};/g, ""));
  });

  const startOfFeed = updatedFeed.substring(0, updatedFeed.indexOf("<item>"));
  const endOfFeed = updatedFeed.substring(
    updatedFeed.lastIndexOf("</item>") + 7
  );

  const processedItemsString = processedItems.join("");

  updatedFeed = `${startOfFeed}${processedItemsString}${endOfFeed}`;

  return updatedFeed;
};

const processItem = (item: string) => {
  // Extract and transform content:encoded using transformContentToMRSS
  const contentEncodedMatch = item.match(
    /<content:encoded>[\s\S]*?<\/content:encoded>/
  );
  let transformedContentEncoded = "";
  if (contentEncodedMatch) {
    transformedContentEncoded = transformContentToMRSS(contentEncodedMatch[0]);
  }

  const modifiedItem = item
    .replace(
      /<content:encoded>[\s\S]*?<\/content:encoded>/,
      transformedContentEncoded
    )
    .replace(/&/g, "&amp;")
    .replace(/<guid isPermaLink="false">.*?<\/guid>/, () => {
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      return `<guid isPermaLink="true">${linkMatch ? linkMatch[1] : ""}</guid>`;
    })
    .replace("+0000", "GMT")
    .replace(/<comments>(.*?)<\/comments>/g, "")
    .replace(/<wfw:commentRss>[\s\S]*?<\/wfw:commentRss>/g, "")
    .replace(/<slash:comments>[\s\S]*?<\/slash:comments>/g, "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");

  return modifiedItem;
};

function getMimeType(url: string) {
  const extension = url?.split(".")?.pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/webp";
  }
}

function transformContentToMRSS(content: string) {
  const srcRegex = /<img.*?src="(.*?)"/;
  const srcMatch = content.match(srcRegex);
  const src = srcMatch ? srcMatch[1] : "";

  const mimeType = getMimeType(src);

  const captionRegex = /<figcaption.*?>(.*?)<\/figcaption>/;
  const captionMatch = content.match(captionRegex);
  const caption = captionMatch ? captionMatch[1].trim().replace(/&/g, "") : "";

  return `<media:content url="${src}" type="${mimeType}">
        <media:description>${caption}</media:description>
        <media:thumbnail url="${src}" />
      </media:content>`;
}

export const fetchRSSFeedPayloads = async (slug: string) => {
  let payload = {};
  switch (slug) {
    case "nation":
      payload = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/nation/feed/",
        category: `<category>Malaysia</category>
        <category>Politics</category>
        <category>National News</category>
        <category>Government</category>
        <category>Parliament</category>
        <category>Economy</category>
        <category>Culture</category>
        <category>Environment</category>
        <category>Health</category>
        <category>Education</category>
        <category>Security</category>
        <category>Law</category>
        <category>Crime</category>
        <category>Courts</category>
        <category>Police</category>
        <category>Military</category>`,
        title:
          "<title>Nation | Malaysia | Politics | Economy | Society | Culture</title>",
        atomLink: `<atom:link href="https://www.freemalaysiatoday.com/feeds/rss/nation" rel="self" type="application/rss+xml" /> <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" type="application/rss+xml" />`,
        fullPath: "<link>https://www.freemalaysiatoday.com/news</link>",
      };
      break;
    case "berita":
      payload = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/top-bm/feed/",
        category: `<category>Berita</category>
        <category>Berita Utama</category>
        <category>Berita Terkini</category>
        <category>Berita Malaysia Terkini</category>
        <category>Analisis Berita Dunia</category>
        <category>Politik Malaysia</category>
        <category>Ekonomi, Bisnis</category>
        <category>Sukan, Hiburan</category>
        <category>Teknologi, Inovasi</category>
        <category>Kesihatan, Gaya Hidup</category>
        <category>Pendidikan, Masyarakat</category>
        <category>Ulasan Khas</category>
        <category>Berita Viral, Trending</category>
        `,
        title:
          "<title>Berita | Tempatan | Pandangan | Dunia | Politik, Ekonomi, Sukan, Teknologi</title>",
        atomLink: `<atom:link href="https://www.freemalaysiatoday.com/feeds/rss/berita" rel="self" type="application/rss+xml" /> <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" type="application/rss+xml" />`,
        fullPath: "<link>https://www.freemalaysiatoday.com/berita</link>",
      };
      break;
    case "business":
      payload = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/business/feed/",
        category: `<category>Global Business News</category>
      <category>Malaysian Economy</category>
      <category>International Trade</category>
      <category>Local Business Trends</category>
      <category>Financial Markets</category>
      <category>Startup Ecosystem in Malaysia</category>
      <category>Corporate Malaysia</category>
      <category>World Economic Events</category>
      <category>Ringgit</category>
      <category>Real Estate Market</category>
      <category>Malaysian Entrepreneurs</category>
      <category>Global Business Strategies</category>
      <category>E-commerce Trends</category>
      <category>Financial Analysis</category>
      <category>Market Insights</category>          
      `,
        title:
          "<title>Business | Local Business | World Business | Malaysia | FMT</title>",
        atomLink:
          '<atom:link href="https://www.freemalaysiatoday.com/feeds/rss/business" rel="self" type="application/rss+xml" /> <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" type="application/rss+xml" />',
        fullPath: "<link>https://www.freemalaysiatoday.com/business</link>",
      };
      break;
    case "headlines":
      payload = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/highlight/feed/",
        category: `<category>Latest News</category>
        <category>Headlines</category>
        <category>Malaysia</category>
        <category>Top Stories</category>
        <category>Local News</category>`,
        title:
          "<title>Headlines | Latest | Malaysia | Top Stories | Local News</title>",
        atomLink:
          '<atom:link href="https://www.freemalaysiatoday.com/feeds/rss/headlines" rel="self" type="application/rss+xml" /> <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" type="application/rss+xml" />',
        fullPath: "<link>https://www.freemalaysiatoday.com/news</link>",
      };
      break;
    case "lifestyle":
      payload = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/leisure/feed/",
        category: `<category>Lifestyle Stories</category>
      <category>Malaysian Cuisine</category>
      <category>Entertainment News</category>
      <category>Family Health Tips</category>
      <category>Financial Advice</category>
      <category>Malaysian Travel Guides</category>
      <category>Latest Tech Trends</category>
      <category>Pet Care Tips</category>
      <category>Local Cultural Highlights</category>
      <category>Healthy Eating</category>
      <category>Parenting and Family Life</category>
      <category>Investment Strategies</category>
      <category>Adventure Travel</category>
      <category>Animal Welfare</category>
      <category>Home and Living</category>
      <category>Nutrition and Fitness</category>
      <category>Entertainment and Events</category>
      <category>Personal Finance</category>
      <category>Travel Destinations</category>
      <category>Emerging Technologies</category>
      <category>Pets and Animals</category>      
      `,
        title:
          "<title>Lifestyle | Food | Entertainment | Health | Family | Money | Travel | Tech | Pets</title>",
        atomLink:
          '<atom:link href="https://www.freemalaysiatoday.com/feeds/rss/lifestyle" rel="self" type="application/rss+xml" /> <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" type="application/rss+xml" />',
        fullPath: "<link>https://www.freemalaysiatoday.com/lifestyle</link>",
      };
      break;
    case "opinion":
      payload = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/opinion/feed/",
        category: `<category>Editorial Insights</category>
        <category>Opinion Columns</category>
        <category>Reader Letters</category>
        <category>Malaysian Perspectives</category>
        <category>Southeast Asia Analysis</category>
        <category>Political Commentary</category>
        <category>Economic Opinions</category>
        <category>Social Issues Debate</category>
        <category>Cultural Critique</category>
        <category>Environmental Advocacy</category>
        <category>Technology Opinions</category>
        <category>Education Reform Discussion</category>
        <category>Public Policy Analysis</category>
        <category>Community Voices</category>
        <category>Historical Perspectives</category>
        <category>Legal Opinions</category>
        <category>Opinion</category>
        `,
        title:
          "<title>Opinion | Editorial | Column | Letters | Malaysia | FMT</title>",
        atomLink:
          '<atom:link href="https://www.freemalaysiatoday.com/feeds/rss/opinion" rel="self" type="application/rss+xml" /> <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" type="application/rss+xml" />',
        fullPath: "<link>https://www.freemalaysiatoday.com/opinion</link>",
      };
      break;
    case "sports":
      payload = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/sports/feed/",
        category: `<category>Global Sports News</category>
      <category>Football Updates</category>
      <category>Badminton Championships</category>
      <category>Motorsports News</category>
      <category>Tennis Grand Slams</category>
      <category>International Sports Events</category>
      <category>Sports Analysis</category>
      <category>Match Highlights</category>
      <category>Sports Governance</category>
      <category>Sports Endorsements and Sponsorships</category>
      <category>Sports and Fitness</category>      
      `,

        title:
          "<title>Sports | Football | Badminton | Tennis | Motorsports</title>",
        atomLink:
          '<atom:link href="https://www.freemalaysiatoday.com/feeds/rss/sports" rel="self" type="application/rss+xml" /> <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" type="application/rss+xml" />',
        fullPath: "<link>https://www.freemalaysiatoday.com/sports</link>",
      };
      break;
    case "world":
      payload = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/world/feed/",
        category: `<category>Latest World News</category>
        <category>World Headlines</category>
        <category>World</category>
        <category>Global Affairs</category>
        <category>International News</category>
        <category>World Politics</category>
        <category>Global Affairs</category>
        `,

        title: "<title>World | Global News | International News | FMT</title>",
        atomLink:
          '<atom:link href="https://www.freemalaysiatoday.com/feeds/rss/world" rel="self" type="application/rss+xml" /> <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" type="application/rss+xml" />',
        fullPath:
          "<link>https://www.freemalaysiatoday.com/category/category/world</link>",
      };
      break;
    case "sea":
      payload = {
        rssUrl:
          "https://cms.freemalaysiatoday.com/category/south-east-asia/feed/",
        category: `<category>Latest SEA News</category>
          <category>Southeast Asian Headlines</category>
          <category>Asian</category>
          `,

        title:
          "<title>SEA | Southeast Asian News | International News | FMT</title>",
        atomLink:
          '<atom:link href="https://www.freemalaysiatoday.com/feeds/rss/south-east-asia" rel="self" type="application/rss+xml" /> <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" type="application/rss+xml" />',
        fullPath:
          "<link>https://www.freemalaysiatoday.com/category/category/south-east-asia</link>",
      };
      break;
    default:
      payload = {
        rssUrl: "https://cms.freemalaysiatoday.com/feed/",
        category: `<category>Free Malaysia Today</category>
        <category>Berita Utama</category>
        <category>FMT</category>
        <category>Headlines</category>
        `,
        title: "<title>Free Malaysia Today | FMT</title>",
        atomLink: `<atom:link href="https://www.freemalaysiatoday.com/feeds/rss/${slug}" rel="self" type="application/rss+xml" /> <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" type="application/rss+xml" />`,
        fullPath: "<link>https://www.freemalaysiatoday.com</link>",
      };
  }
  return payload;
};
