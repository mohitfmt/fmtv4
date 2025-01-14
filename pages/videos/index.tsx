import { GetStaticProps } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Playlist from "@/components/videos/Playlist";
import { youTubePlaylists } from "@/constants/youtube-playlists";
import SubscribeButton from "@/components/videos/SubscribeButton";
import AdSlot from "@/components/common/AdSlot";

interface VideosProps {
  info: any;
}

const dfpTargetingParams = {
  pos: "listing",
  section: ["news videos"],
  key: [],
};

const Videos = ({ info }: VideosProps) => {
  return (
    <>
      <Head>
        <title>News Videos | Free Malaysia Today (FMT)</title>
        <meta
          name="description"
          content="Watch the breaking news videos, popular videos, FMT special report and exclusive original videos on Free Malaysia Today (FMT)."
        />
      </Head>

      {/* Top Mobile Ad */}
      <div className="ads-small-mobile">
        <AdSlot
          sizes={[
            [320, 50],
            [320, 100],
          ]}
          id="div-gpt-ad-1661362470988-0"
          name="ROS_Mobile_Leaderboard"
          visibleOnDevices="onlyMobile"
          targetingParams={dfpTargetingParams}
        />
      </div>

      <div className="py-2 md:py-4 overflow-hidden">
        <h1 className="mt-4 text-center text-2xl md:text-4xl font-extrabold">
          Videos
        </h1>

        {/* Channel Info Section */}

        <Link
          href="https://www.youtube.com/channel/UC2CzLwbhTiI8pTKNVyrOnJQ"
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-6 md:mt-8 flex flex-col items-center gap-3 md:gap-4 rounded-lg bg-muted  p-4 md:p-8"
          aria-label="Visit our YouTube Channel"
        >
          {info?.snippet?.thumbnails && (
            <div className="relative w-20 h-20 md:w-24 md:h-24">
              <Image
                alt={info?.snippet?.title}
                className="rounded-full border border-yellow-600"
                src={info?.snippet?.thumbnails?.default?.url}
                fill
                sizes="(max-width: 768px) 80px, 96px"
                quality={75}
                priority
              />
            </div>
          )}

          <h2 className="text-lg md:text-2xl font-bold text-center">
            {info?.snippet?.title}
          </h2>

          <p className="text-xs md:text-sm font-medium">
            {Math.floor(info?.statistics?.subscriberCount / 1000)}K Subscribers
          </p>
  
          <p className="mx-auto max-w-2xl text-center text-xs md:text-sm font-medium line-clamp-3">
            {info?.snippet?.description}
          </p>

          <div className="relative">
            <SubscribeButton channelId={info?.id} />
          </div>
        </Link>

        {/* Playlist Tabs */}
        <main className="pt-1">
          <Tabs defaultValue={youTubePlaylists[0].id} className="w-full">
            <TabsList className="flex w-full py-4 items-center bg-muted overflow-y-hidden justify-start overflow-x-auto lg:justify-center space-x-2 md:space-x-4">
              {youTubePlaylists?.map((playlist) => (
                <TabsTrigger
                  key={playlist.id}
                  value={playlist.id}
                  className="text-xs md:text-sm"
                >
                  {playlist.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {youTubePlaylists?.map((playlist) => (
              <TabsContent
                key={playlist.id}
                value={playlist.id}
                className="mt-2 md:mt-4"
              >
                <Playlist playlistId={playlist.playlistId} />
              </TabsContent>
            ))}
          </Tabs>
        </main>

        {/* Bottom Mobile Ad */}
        <div className="ads-medium-mobile">
          <AdSlot
            id="div-gpt-ad-1661355704641-0"
            name="ROS_Midrec_b"
            sizes={[300, 250]}
            visibleOnDevices="onlyMobile"
            targetingParams={dfpTargetingParams}
          />
        </div>
      </div>
    </>
  );
};

export default Videos;

export const getStaticProps: GetStaticProps<VideosProps> = async () => {
  try {
    const params = new URLSearchParams({
      key: process.env.YOUTUBE_API_KEY ?? "",
      forUsername: "FreeMalaysiaToday",
      part: "snippet,statistics",
    });

    const res = await fetch(
      `https://youtube.googleapis.com/youtube/v3/channels?${params}`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch channel info");
    }

    const data = await res.json();
    const channel = data?.items[0];

    return {
      props: {
        info: channel || null,
      },
      revalidate: 45,
    };
  } catch (e) {
    console.error("Error while fetching youtube details", e);
    return {
      props: {
        info: null,
      },
      revalidate: 45,
    };
  }
};
