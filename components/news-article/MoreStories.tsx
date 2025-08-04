import React from "react";
import Link from "next/link";
import Image from "next/image";
import PublishingDateTime from "../common/display-date-formats/PublishingDateTime";
import { getPreferredCategory } from "@/lib/utils";

// Define the structure of a single story
interface StoryProps {
  id: string;
  databaseId: number;
  slug: string;
  uri: string;
  title: string;
  date: string;
  excerpt: string;
  featuredImage?: {
    node: {
      sourceUrl?: string;
    };
  };
  categories?: {
    edges?: Array<{
      node: {
        id: string;
        name: string;
      };
    }>;
  };
}

// Props interface for the component
interface MoreStoriesProps {
  moreStories?: StoryProps[];
}

const MoreStories: React.FC<MoreStoriesProps> = ({ moreStories }) => {
  // Early return if no related posts
  if (!moreStories || moreStories.length === 0) {
    return null;
  }

  return (
    <section className="more-stories" aria-live="polite">
      <div className="space-y-4 py-2">
        {moreStories.map((node) => {
          // Get preferred category for each story
          const preferredCategory = getPreferredCategory(
            node.categories?.edges
          );

          return (
            <div
              key={node.id ?? node.uri}
              className="relative grid grid-cols-12 gap-4"
            >
              <div className="col-span-4">
                <Link
                  href={node.uri}
                  className="block hover:scale-105 transition-all ease-linear duration-100"
                >
                  <Image
                    src={
                      node.featuredImage?.node?.sourceUrl || "/placeholder.jpg"
                    }
                    alt={node.title || "Story Image"}
                    width={200}
                    height={150}
                    layout="responsive"
                    objectFit="cover"
                    className="rounded-lg"
                  />
                </Link>
              </div>

              <div className="col-span-8">
                <div className="text-xs text-accent-category flex gap-2 items-center justify-between">
                  {preferredCategory && (
                    <span
                      key={preferredCategory.node.id}
                      className="tracking-wider"
                    >
                      {preferredCategory.node.name.toUpperCase()}
                    </span>
                  )}
                  <div className="text-sm font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
                    <PublishingDateTime dateString={node.date} size={16} />
                  </div>
                </div>
                <Link href={node.uri} className="block">
                  <h3 className="mb-2 font-semibold hover:text-accent-blue">
                    {node.title}
                  </h3>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MoreStories;
