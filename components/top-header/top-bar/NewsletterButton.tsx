import React, { useState } from "react";
import NewsletterModal from "./NewsletterModal";
import { Button } from "@/components/ui/button";
import { Envelope } from "@phosphor-icons/react";

const NewsletterButton = () => {
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  return (
    <div className="relative hidden lg:block">
      {/* <div
        onClick={() => setIsNewsletterOpen(true)}
        className="rounded-md  px-3 py-0.5 uppercase block cursor-pointer border border-stone-400 hover:bg-accent-yellow hover:text-black hover:border-stone-950"
      >
        Newsletter
      </div> */}
      <Button
        variant="outline"
        onClick={() => setIsNewsletterOpen(true)}
        className="lg:flex bg-transparent hover:bg-accent-yellow dark:text-white lg:text-white border-black dark:border-white lg:border-white br-border uppercase"
      >
        Newsletter
        <span className="sr-only">Newsletter</span>
      </Button>
      <NewsletterModal
        isOpen={isNewsletterOpen}
        onClose={() => setIsNewsletterOpen(false)}
      />
    </div>
  );
};

export default NewsletterButton;
