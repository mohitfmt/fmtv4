import Head from "next/head";
import { WebPageJsonLD } from "@/constants/jsonlds/org";
import SearchLayout from "@/components/search-page/SearchLayout";

const KEYWORDS = [
  "Free Malaysia Today Search",
  "FMT Search",
  "Malaysia News Search",
  "Search Malaysian Politics",
  "Search Malaysian Economy",
  "Search Malaysian Current Affairs",
  "Find Malaysia News",
  "Malaysia News Archive",
  "Malaysian News Database",
  "Search English Malay News",
  "Malaysia News Filter",
  "Custom Malaysia News Search",
].join(", ");

const Search = () => {
  return (
    <>
      <Head>
        <title>
          Search Free Malaysia Today (FMT) | Find Latest News, Articles, and
          Analysis
        </title>
        <meta
          name="description"
          content="Search Free Malaysia Today for the latest Malaysian news, current affairs, business updates, and in-depth analysis. Find accurate and timely information on politics, economy, lifestyle, and more."
        />
        <meta name="keywords" content={KEYWORDS} />
        <meta name="author" content="Free Malaysia Today" />
        <meta name="category" content="searchpage" />

        {/* Canonical URL */}
        <link
          rel="canonical"
          href="https://www.freemalaysiatoday.com/search/"
        />

        {/* Feed Links */}
        <link
          rel="alternate"
          type="application/atom+xml"
          href="feeds/atom/search/"
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          href="feeds/rss/search/"
        />
        <link
          rel="alternate"
          type="application/feed+json"
          href="feeds/json/search/"
        />

        {/* OpenGraph Tags */}
        <meta
          property="og:title"
          content="Search Free Malaysia Today (FMT) | Find Latest News and Analysis"
        />
        <meta
          property="og:description"
          content="Search FMT for the latest Malaysian news, current affairs, business updates, and in-depth analysis. Find accurate and timely information on politics, economy, lifestyle, and more."
        />
        <meta
          property="og:url"
          content="https://www.freemalaysiatoday.com/search/"
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg"
        />
        <meta
          property="og:image:secure_url"
          content="https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg"
        />
        <meta property="og:image:alt" content="News | Free Malaysia Today" />

        {/* Twitter Cards */}
        <meta
          name="twitter:title"
          content="Search Free Malaysia Today (FMT) | Find Latest News and Analysis"
        />
        <meta
          name="twitter:description"
          content="Search FMT for the latest Malaysian news, current affairs, business updates, and in-depth analysis. Find accurate and timely information on politics, economy, lifestyle, and more."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta
          name="twitter:image"
          content="https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg"
        />
        <meta
          name="twitter:image:alt"
          content="Latest News | Free Malaysia Today"
        />

        {/* Robot Directives */}
        <meta
          name="robots"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="googlebot"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="googlebot-news"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />

        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WebPageJsonLD) }}
          type="application/ld+json"
        />
      </Head>

      <SearchLayout />
    </>
  );
};

export default Search;
