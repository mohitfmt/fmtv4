import Link from "next/link";
import Image from "next/image";
import {
  formattedDate,
  formattedDisplayDate,
} from "../common/display-date-formats/DateFormates";
import { PostCardProps } from "@/types/global";

interface PhotoCardProps {
  node: PostCardProps;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ node }) => {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg cursor-pointer group">
      <Link href={node.uri} className="absolute inset-0" title={node.title}>
        <div className="relative h-full w-full overflow-hidden">
          <Image
            src={node.featuredImage.node.sourceUrl}
            alt={node.title}
            fill
            className="relative  object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent to-black/60 group-hover:to-black/40 opacity-100 group-hover:opacity-80 transition-opacity duration-300" />
          <div className="absolute bottom-0 z-20 p-4">
            <h2 className="text-lg font-bold text-white">{node.title}</h2>
            <time
              className="text-sm font-medium text-white transition-all duration-300 group-hover:text-opacity-80"
              dateTime={formattedDate(node.date)}
            >
              {formattedDisplayDate(node.date)}
            </time>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default PhotoCard;
