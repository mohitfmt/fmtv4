import { addHours, format } from "date-fns";

// Helper function to get the current date-time in RFC 3339 format for Atom feeds
const getCurrentDateTimeForAtom = () => {
  return format(addHours(new Date(), -8), "yyyy-MM-dd'T'HH:mm:ssXXX");
};
export const dynamic = "force-dynamic";

export const transformRssToAtomFeed = (
  rssFeed: string,
  atomSpecifics: {
    id: string;
    title: string;
    subtitle: string;
    link: string;
    selfLink: string;
    categories: string;
  }
) => {
  const linkMatch = rssFeed.match(/<lastBuildDate>(.*?)<\/lastBuildDate>/);
  const updatedDateTime = linkMatch
    ? format(new Date(linkMatch[1]), "yyyy-MM-dd'T'HH:mm:ssXXX")
    : getCurrentDateTimeForAtom();

  let atomFeed = `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
        <title>${atomSpecifics?.title}</title>
        <subtitle>${atomSpecifics?.subtitle}</subtitle>
        <link href="${atomSpecifics?.link}" rel="alternate" type="text/html" />
        <link href="${atomSpecifics?.selfLink}" rel="self" type="application/atom+xml" />
        <link href="https://pubsubhubbub.appspot.com/" rel="hub" />
        <updated>${updatedDateTime}</updated>
        <id>${atomSpecifics?.id}</id>
        ${atomSpecifics?.categories}
        <author>
            <name>Free Malaysia Today</name>
            <email>info@freemalaysiatoday.com</email>
        </author>
        <contributor>
            <name>Free Malaysia Today</name>
        </contributor>
        <icon>https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg</icon>
        <logo>https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg</logo>
        <rights>2009 - Free Malaysia Today (FMT)</rights>
        `;

  const rssItems = rssFeed.match(/<item>[\s\S]*?<\/item>/g) || [];
  rssItems.forEach((item) => {
    const transformedEntry = transformRssItemToAtomEntry(item);
    atomFeed += transformedEntry;
  });

  atomFeed += `</feed>`;

  return atomFeed;
};

const transformRssItemToAtomEntry = (rssItem: string): string => {
  let entry = "<entry>";

  const authorMatch = rssItem.match(/<dc:creator>(.*?)<\/dc:creator>/);
  if (authorMatch) {
    entry += `<author><name>${authorMatch[1]}</name></author>`;
  }

  const titleMatch = rssItem.match(/<title>(.*?)<\/title>/);
  if (titleMatch) {
    entry += `<title>${titleMatch[1]}</title>`;
  }

  const linkMatch = rssItem.match(/<link>(.*?)<\/link>/);
  if (linkMatch) {
    entry += `<link href="${linkMatch[1]}" /> <id>${linkMatch[1]}</id>`;
  }

  const descriptionMatch = rssItem.match(/<description>(.*?)<\/description>/);
  if (descriptionMatch) {
    entry += `<summary type="html">${descriptionMatch[1]}</summary>`;
  }

  const contenMatch = rssItem.match(
    /<content:encoded>[\s\S]*?<\/content:encoded>/
  );
  let contentFromEncoded = contenMatch?.[0];
  contentFromEncoded = contentFromEncoded
    ? Buffer.from(contentFromEncoded, "binary").toString("utf-8")
    : "";

  contentFromEncoded = contenMatch?.[0]
    .replace("<content:encoded>", "")
    .replace("</content:encoded>", "")
    .replace(/<figure([\s\S]*?)<\/figure>/g, "")
    .replace(/<p>[\s\S]*?<img.*?>[\s\S]*?<\/p>/g, "")
    .replace(/<iframe([\s\S]*?)<\/iframe>/g, "")
    .replace(/&#\d{4};/g, "")
    .replace(/[^\x20-\x7E\n\t\r]/g, "");

  if (contenMatch) {
    entry += `<content type="html">${contentFromEncoded}</content>`;
  }

  const pubDateMatch = rssItem.match(/<pubDate>(.*?)<\/pubDate>/);
  entry += `<updated>${
    pubDateMatch
      ? format(new Date(pubDateMatch[1]), "yyyy-MM-dd'T'HH:mm:ssXXX")
      : getCurrentDateTimeForAtom()
  }</updated>`;

  // Close the entry tag
  entry += "</entry>";

  return entry;
};

export const fetchATOMFeedPayloads = async (slugStr: string) => {
  let payloadObj = {};
  switch (slugStr) {
    case "nation":
      payloadObj = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/nation/feed/?orderby=modified&order=desc",
        link: "https://www.freemalaysiatoday.com/news",
        title:
          "Nation | Politics | Economy | Social | Crime | Education | Environment",
        subtitle:
          "Breaking News, In-Depth Analysis, and Unmissable Stories from Malaysia",
        selfLink: "https://www.freemalaysiatoday.com/feeds/atom/nation",
        categories: `
        <category term="Nation" scheme="https://www.freemalaysiatoday.com/news" label="Malaysia and Sabah Sarawak"/>
        <category term="MalaysiaEastWest" scheme="https://www.freemalaysiatoday.com/category/category/nation" label="Malaysia: East and West"/>
        <category term="Borneo+" scheme="https://www.freemalaysiatoday.com/category/category/nation/sabahsarawak" label="Borneo News: Sabah and Sarawak News"/>
        `,
      };
      break;
    case "berita":
      payloadObj = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/top-bm/feed/?orderby=modified&order=desc",
        link: "https://www.freemalaysiatoday.com/berita",
        title:
          "Berita | Tempatan | Pandangan | Dunia | Politik, Ekonomi, Sukan, Teknologi",
        subtitle:
          "Bahasa Melayu, Berita Tempatan, Berita Dunia, Berita Politik, Berita Ekonomi, Berita Sukan, Berita Teknologi",
        selfLink: "https://www.freemalaysiatoday.com/feeds/atom/berita",
        categories: `
        <category term="Berita" scheme="https://www.freemalaysiatoday.com/berita" label="Berita"/>
        <category term="Tempatan" scheme="https://www.freemalaysiatoday.com/category/category/bahasa/tempatan" label="Tempatan"/>
        <category term="Pandangan" scheme="https://www.freemalaysiatoday.com/category/category/bahasa/pandangan" label="Pandangan"/>
        <category term="Dunia" scheme="https://www.freemalaysiatoday.com/category/category/bahasa/dunia" label="Dunia"/>
        `,
      };
      break;
    case "business":
      payloadObj = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/business/feed/?orderby=modified&order=desc",
        link: "https://www.freemalaysiatoday.com/business",
        title: "Business | Local Business | World Business | Malaysia | FMT",
        subtitle:
          "Empowering Insights: Navigating the Dynamics of Malaysian and Global Markets",
        selfLink: "https://www.freemalaysiatoday.com/feeds/atom/business",
        categories: `
        <category term="BusinessNews" scheme="https://www.freemalaysiatoday.com/business" label="Business News"/>
        <category term="LocalBusiness" scheme="https://www.freemalaysiatoday.com/category/category/business/local-business" label="Local Business"/>
        <category term="WorldBusiness" scheme="https://www.freemalaysiatoday.com/category/category/business/world-business" label="World Business"/>
        `,
      };
      break;
    case "headlines":
      payloadObj = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/highlight/feed/?orderby=modified&order=desc",
        link: "https://www.freemalaysiatoday.com",
        title: "Headlines | Latest | Malaysia | Top Stories | Local News",
        subtitle:
          "Your Pulse on Malaysia: Breaking News, In-Depth Analysis, and Unmissable Stories",
        selfLink: "https://www.freemalaysiatoday.com/feeds/atom/headlines",
        categories:
          '<category term="LatestHeadlines" scheme="https://www.freemalaysiatoday.com" label="Latest Headlines"/>',
      };
      break;
    case "lifestyle":
      payloadObj = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/leisure/feed/?orderby=modified&order=desc",
        link: "https://www.freemalaysiatoday.com/lifestyle",
        title:
          "Lifestyle | Food | Entertainment | Health | Family | Money | Travel | Tech | Pets",
        subtitle:
          "Enriching Every Moment: From Culinary Delights to Tech Trends and Beyond",
        selfLink: "https://www.freemalaysiatoday.com/feeds/atom/lifestyle",
        categories: `
        <category term="Lifestyle" scheme="https://www.freemalaysiatoday.com/lifestyle" label="Lifestyle"/>
        <category term="SimpleStories" scheme="https://www.freemalaysiatoday.com/category/category/leisure/simple-stories" label="Simple Stories"/>
        <category term="Food" scheme="https://www.freemalaysiatoday.com/category/category/leisure/food" label="Food"/>
        <category term="Entertainment" scheme="https://www.freemalaysiatoday.com/category/category/leisure/entertainment" label="Entertainment"/>
        <category term="HealthFamily" scheme="https://www.freemalaysiatoday.com/category/category/leisure/health" label="Health and Family"/>
        <category term="Money" scheme="https://www.freemalaysiatoday.com/category/category/leisure/money" label="Money"/>
        <category term="Travel" scheme="https://www.freemalaysiatoday.com/category/category/leisure/travel" label="Travel"/>
        <category term="Tech" scheme="https://www.freemalaysiatoday.com/category/category/leisure/tech" label="Tech"/>
        <category term="Pets" scheme="https://www.freemalaysiatoday.com/category/category/leisure/pets" label="Pets"/>
        `,
      };
      break;
    case "opinion":
      payloadObj = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/opinion/feed/?orderby=modified&order=desc",
        link: "https://www.freemalaysiatoday.com/opinion",
        title: "Opinion | Editorial | Column | Letters",
        subtitle:
          "Voices That Matter: Exploring Diverse Perspectives on Todays Issues",
        selfLink: "https://www.freemalaysiatoday.com/feeds/atom/opinion",
        categories: `
        <category term="Opinion" scheme="https://www.freemalaysiatoday.com/opinion" label="Opinion"/>
        <category term="EditorialInsights" scheme="https://www.freemalaysiatoday.com/category/category/opinion/editorial" label="Editorial Insights"/>
        <category term="OpinionColumns" scheme="https://www.freemalaysiatoday.com/category/category/opinion/column" label="Opinion Columns"/>
        <category term="ReaderLetters" scheme="https://www.freemalaysiatoday.com/category/category/opinion/letters" label="Reader Letters"/>
        `,
      };
      break;
    case "sports":
      payloadObj = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/sports/feed/?orderby=modified&order=desc",
        link: "https://www.freemalaysiatoday.com/sports",
        title: "Sports | Football | Badminton | Tennis | Motorsports",
        subtitle:
          "The Thrill of the Game: Capturing Every Victory, Every Heartbeat",
        selfLink: "https://www.freemalaysiatoday.com/feeds/atom/sports",
        categories: `
        <category term="SportsNews" scheme="https://www.freemalaysiatoday.com/sports" label="Sports News"/>
        <category term="Football" scheme="https://www.freemalaysiatoday.com/category/category/sports/football" label="Football"/>
        <category term="Badminton" scheme="https://www.freemalaysiatoday.com/category/category/sports/badminton" label="Badminton"/>
        <category term="Tennis" scheme="https://www.freemalaysiatoday.com/category/category/sports/tennis" label="Tennis"/>
        <category term="Motorsports" scheme="https://www.freemalaysiatoday.com/category/category/sports/motorsports" label="Motorsports"/>
        `,
      };
      break;
    case "world":
      payloadObj = {
        rssUrl: "https://cms.freemalaysiatoday.com/category/world/feed/?orderby=modified&order=desc",
        link: "https://www.freemalaysiatoday.com/category/category/world",
        title: "World | Global News | International News",
        subtitle:
          "Navigating the Global Pulse: Unraveling the Stories Shaping Our World",
        selfLink: "https://www.freemalaysiatoday.com/feeds/atom/world",
        categories:
          '<category term="WorldNews" scheme="https://www.freemalaysiatoday.com/category/category/world" label="World News"/>',
      };
      break;
    case "sea":
      payloadObj = {
        rssUrl:
          "https://cms.freemalaysiatoday.com/category/south-east-asia/feed/?orderby=modified&order=desc",
        link: "https://www.freemalaysiatoday.com/category/category/south-east-asia",
        title: "Southeast Asia | Asian News | International News",
        subtitle:
          "Navigating the Global Pulse: Unraveling the Stories Shaping Our SEA (Southeast Asia)",
        selfLink:
          "https://www.freemalaysiatoday.com/feeds/atom/south-east-asia",
        categories:
          '<category term="south-east-asiaNews" scheme="https://www.freemalaysiatoday.com/category/category/south-east-asia" label="south-east-asia News"/>',
      };
      break;
    default:
      payloadObj = {
        rssUrl: "https://cms.freemalaysiatoday.com/feed/?orderby=modified&order=desc",
        link: "https://www.freemalaysiatoday.com",
        title: "Free Malaysia Today",
        subtitle:
          "Free Malaysia Today (FMT) | Current Affairs, Business, Economy, Lifestyle, News and Analysis",
        selfLink: `https://www.freemalaysiatoday.com/feeds/atom/${slugStr}`,
        categories:
          '<category term="FMT" scheme="https://www.freemalaysiatoday.com" label="Free Malaysia Today"/>',
      };
  }
  return payloadObj;
};
