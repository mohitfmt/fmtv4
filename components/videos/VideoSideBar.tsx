import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import FullDateDisplay from "../common/display-date-formats/FullDateDisplay";

interface RelatedVideosSidebarProps {
  videos: any[];
  playlistId: string;
}

export const RelatedVideosSidebar: React.FC<RelatedVideosSidebarProps> = ({
  videos,
  playlistId,
}) => {
  return (
    <aside className="rounded-lg bg-primary-foreground text-foreground py-4 md:p-6 lg:w-1/3 lg:p-8">
      <h3 className="text-2xl font-extrabold">Latest Videos</h3>

      <div className="flex flex-col gap-4 py-4">
        {videos?.map(({ node }: { node: any }) => (
          <Link
            key={node?.id}
            href={node?.uri}
            prefetch={false}
            className="relative flex items-center gap-4"
          >
            <div className="w-2/4 relative min-h-20 ">
              <Image
                alt={node?.title}
                className="rounded-lg object-cover transition-transform duration-300 hover:scale-105"
                src={node?.featuredImage?.node?.mediaItemUrl}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={75}
              />
            </div>

            <div className="w-3/4">
              <h3 className="text-sm font-semibold line-clamp-2 hover:text-accent-blue">
                {node?.title}
              </h3>

              <FullDateDisplay
                dateString={node?.dateGmt}
                tooltipPosition="right"
                textSize="small"
              />
            </div>
          </Link>
        ))}
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
