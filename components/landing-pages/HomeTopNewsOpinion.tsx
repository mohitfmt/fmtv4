import {  useState } from "react";
import Link from "next/link";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import LTRNewsPreview from "../common/news-preview-cards/LTRNewsPreview";
import SectionHeading from "../common/SectionHeading";
import { HomePost } from "@/types/global";

interface HorizontalNewsContentProps {
  posts: HomePost[];
  loading?: boolean;
  categoryRoute: string;
  categoryName: string;
  sectionTitle: string;
  className?: string;
}

const HorizontalNewsContent = ({
  posts: initialPosts,
  loading = false,
  categoryName,
  categoryRoute,
  sectionTitle,
  className = "",
}: HorizontalNewsContentProps) => {
  const [posts, setPosts] = useState<HomePost[]>([]);

  // Update posts when initialPosts changes



  // Split posts into top (2) and bottom (4)
  const topPosts = posts.slice(0, 2);
  const bottomPosts = posts.slice(2, 6);

  return (
    <div className={className}>
      <Link href={`/${categoryRoute}`}>
        <SectionHeading sectionName={sectionTitle} />
      </Link>
      <div>
        <div className="grid grid-cols-2 gap-4">
          {topPosts.map((post) => (
            <TTBNewsPreview key={post.slug} {...post} isBig={true} />
          ))}
        </div>
        <div className="mt-8 grid lg:grid-cols-2 gap-4">
          {bottomPosts.map((post) => (
            <LTRNewsPreview key={post.slug} {...post} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HorizontalNewsContent;
