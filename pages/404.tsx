import Head from "next/head";
import Image from "next/image";
import Link from "next/link";

const NotFound = () => {
  const siteUrl = `https://${process.env.NEXT_PUBLIC_DOMAIN ?? "www.freemalaysiatoday.com"}`;

  return (
    <>
      <Head>
        <title>We are sorry, Page not found! | Free Malaysia Today (FMT)</title>

        <meta
          name="description"
          content="Explore 24/7 news on politics, economy, and more with Free Malaysia Today. Your source for unbiased Malaysian news in English & Malay since 2009."
        />
        <meta
          name="keywords"
          content="Free Malaysia Today, Malaysia News, Latest Malaysia News, Breaking News Malaysia, Malaysia Politics News, Malaysia Economic News, Malaysia International News, Free News Malaysia, 24/7 News Malaysia, Malaysian Cultural News, English Malay News Online, Comprehensive Malaysian News."
        />
        <link rel="canonical" href={`${siteUrl}/404`} />
        {/* Open Graph */}
        <meta
          property="og:title"
          content="Free Malaysia Today | FMT | 404 | Not Found"
        />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg"
        />
        <meta
          property="og:description"
          content="Explore 24/7 news on politics, economy, and more with Free Malaysia Today. Your source for unbiased Malaysian news in English & Malay since 2009."
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta
          name="twitter:title"
          content="Free Malaysia Today | FMT | 404 | Not Found"
        />
        <meta
          name="twitter:description"
          content="Explore 24/7 news on politics, economy, and more with Free Malaysia Today. Your source for unbiased Malaysian news in English & Malay since 2009."
        />
        <meta
          name="twitter:image"
          content="https://media.freemalaysiatoday.com/wp-content/uploads/2018/09/logo-white-fmt-800x500.jpg"
        />
      </Head>

      <section className="flex h-screen flex-col items-center justify-center px-4">
        <div className="relative mx-auto w-full max-w-xl aspect-[4/3]">
          <Image
            src="/404.webp"
            alt="404"
            fill
            priority
            className="object-contain"
          />
        </div>
        <p className="my-5 p-3 text-center text-xl">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>
        <Link
          href="/"
          className="rounded-md bg-accent-blue py-4 px-4 text-lg font-semibold text-white transition-all duration-200 hover:scale-105"
        >
          Return Home
        </Link>
      </section>
    </>
  );
};

export default NotFound;
