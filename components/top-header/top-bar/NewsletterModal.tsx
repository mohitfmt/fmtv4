"use client";

import { ReactNode, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import NewsletterForm from "@/components/news-article/NewsLetterForm";

type NewsletterModalProps = {
  trigger: ReactNode;
};

const NewsletterModal = ({ trigger }: NewsletterModalProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    // Refresh ads when dialog state changes
    if (typeof window.googletag !== "undefined") {
      window.googletag.cmd.push(() => {
        window.googletag.pubads().refresh();
      });
    }
  };

  useEffect(() => {
    if (typeof window.smartech !== "undefined") {
      window.smartech("dispatch", "newsletter page load", {
        title: "newsletter page load",
      });
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {isOpen && (
        <DialogContent className="max-w-3xl py-16 px-10">
          <NewsletterForm />
        </DialogContent>
      )}
    </Dialog>
  );
};

export default NewsletterModal;
