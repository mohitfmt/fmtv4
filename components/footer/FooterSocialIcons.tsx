import { social } from "@/constants/social";
import Link from "next/link";
import React from "react";

const FooterSocialIcons: React.FC = () => (
  <nav className="flex flex-wrap items-center justify-center gap-4 py-5">
    {social.map((item) => (
      <Link
        key={item.name}
        href={item.url}
        title={item.name}
        target="_blank"
        rel="noopener noreferrer"
        className="flex text-xl items-center p-4 bg-black hover:bg-yellow-400 hover:text-black rounded-full transition-colors duration-300"
      >
        {/* Directly render the icon with color and size */}
        <item.icon color={item.color} size={25} />
      </Link>
    ))}
  </nav>
);

export default FooterSocialIcons;
