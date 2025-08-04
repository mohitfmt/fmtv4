import React from "react";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import SectionHeading from "../common/SectionHeading";

// Define the structure of the related data
interface RelatedPost {
  id: string;
  databaseId: number;
  slug: string;
  uri: string;
  title: string;
  dateGmt: string;
  excerpt: string;
  featuredImage?: {
    node: {
      sourceUrl?: string;
    };
  };
}

interface RelatedNewsProps {
  relatedPosts: RelatedPost[];
  isBig?: boolean;
}

const RelatedNews: React.FC<RelatedNewsProps> = ({
  relatedPosts,
  isBig = false,
}) => {
  // Early return if no related posts
  if (!relatedPosts || relatedPosts.length === 0) {
    return null;
  }

  return (
    <section className="mt-8" aria-live="polite">
      {/* <h2 className="text-2xl font-extrabold">Related News</h2> */}
      <SectionHeading sectionName="Related News" />
      <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2 lg:grid-cols-3">
        {relatedPosts.map((post) => (
          <TTBNewsPreview key={post.id || post.slug} {...post} isBig={isBig} />
        ))}
      </div>
    </section>
  );
};

export default RelatedNews;
