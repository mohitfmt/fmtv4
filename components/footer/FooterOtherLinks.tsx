import Link from "next/link";
import React from "react";

export default function FooterOtherLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-4 py-2 text-sm text-gray-300">
      {[
        "contact-us",
        "about",
        "advertise",
        "career",
        "disclaimers-copyright",
        "privacy-policy",
      ].map((link) => (
        <Link
          key={link}
          href={`/${link}`}
          className="hover:text-yellow-400 hover:underline decoration-1 underline-offset-2"
        >
          {link.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Link>
      ))}
    </div>
  );
}
