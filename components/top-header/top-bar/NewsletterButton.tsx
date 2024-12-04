import React, { useState } from "react";
import NewsletterModal from "./NewsletterModal";

const NewsletterButton = () => {
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  return (
    <div className = "relative hidden lg:block">
      <div
        onClick={() => setIsNewsletterOpen(true)}
        className="rounded-md  px-3 py-0.5 uppercase block cursor-pointer border border-stone-400 hover:bg-accent-yellow hover:text-black hover:border-stone-950"
      >
        Newsletter
      </div>
      <NewsletterModal
        isOpen={isNewsletterOpen}
        onClose={() => setIsNewsletterOpen(false)}
      />
    </div>
  );
};

export default NewsletterButton;
