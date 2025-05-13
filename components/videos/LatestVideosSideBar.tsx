import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import FullDateDisplay from "../common/display-date-formats/FullDateDisplay";

interface RelatedVideosSidebarProps {
  videos: any[];
  playlistId: string;
}

export const LatestVideosSidebar: React.FC<RelatedVideosSidebarProps> = ({
  videos,
  playlistId,
}) => {
  return (
    <aside className="rounded-lg bg-primary-foreground text-foreground p-4  md:p-6 lg:w-1/3 lg:p-8">
      <h2 className="text-2xl font-extrabold">Latest Videos</h2>

      <div className="flex flex-col gap-4 py-4">
        {videos?.map(({ node }: { node: any }) => {
          if (!node) {
            console.warn("[LatestVideosSidebar] Missing video node:", node);
            return null;
          }

          const thumbnail = node?.featuredImage?.node?.mediaItemUrl;
          const date = node?.dateGmt;

          return (
            <Link
              key={node?.id}
              href={node?.uri || "#"}
              prefetch={false}
              className="relative flex items-center gap-4"
            >
              <div className="w-2/4 relative min-h-20">
                {thumbnail ? (
                  <Image
                    alt={node?.title || "Video thumbnail"}
                    className="rounded-lg object-cover transition-transform duration-300 hover:scale-105"
                    src={thumbnail}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    quality={75}
                  />
                ) : (
                  <div className="bg-gray-200 w-full h-full rounded-lg flex items-center justify-center text-sm text-gray-500">
                    No image
                  </div>
                )}
              </div>

              <div className="w-3/4">
                <h2 className="text-sm font-semibold line-clamp-2 hover:text-accent-blue">
                  {node?.title || "Untitled video"}
                </h2>

                {date && (
                  <FullDateDisplay
                    dateString={date}
                    tooltipPosition="right"
                    textSize="small"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Link
          href={`https://www.youtube.com/playlist?list=${playlistId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            className="rounded-full text-foreground"
            size="lg"
            variant="outline"
          >
            View More
          </Button>
        </Link>
      </div>
    </aside>
  );
};
