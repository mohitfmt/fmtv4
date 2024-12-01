import React, { useState } from "react";
import NewsletterModal from "./NewsletterModal";

const NewsletterButton = () => {
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  return (
    <>
      <div
        onClick={() => setIsNewsletterOpen(true)}
        className="rounded-md hidden px-3 py-0.5 uppercase xl:block cursor-pointer border border-stone-400 hover:bg-yellow-400 hover:text-black hover:border-stone-950"
      >
        Newsletter
      </div>
      <NewsletterModal
        isOpen={isNewsletterOpen}
        onClose={() => setIsNewsletterOpen(false)}
      />
    </>
  );
};

export default NewsletterButton;
