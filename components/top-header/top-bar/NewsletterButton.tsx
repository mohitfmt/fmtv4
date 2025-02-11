'use client'

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import NewsletterModal from "./NewsletterModal";

const NewsletterButton = () => {
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);

  return (
    <div className="relative hidden lg:block">
      <NewsletterModal
        trigger={
          <Button
            variant="outline"
            className="lg:flex bg-transparent hover:bg-accent-yellow dark:text-white lg:text-white border-black dark:border-white lg:border-white br-border uppercase"
            size="sm"
          >
            Newsletter
            <span className="sr-only">Newsletter</span>
          </Button>
        }
      />
    </div>
  );
};

export default NewsletterButton;