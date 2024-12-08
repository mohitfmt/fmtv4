import React from "react";
import Link from "next/link";
import { social } from "@/constants/social";

interface SocialIconsProps {
  className?: string;
  iconClassName?: string;
  useColors?: boolean;
  iconSize?: number;
}

export const SocialIcons: React.FC<SocialIconsProps> = ({
  className = "",
  iconClassName = "",
  useColors = false,
  iconSize = 1,
}) => {
  return (
    <nav
      className={`flex flex-row items-center gap-0 md:gap-1 overflow-hidden ${className}`}
    >
      {social.map(({ name, url, icon: Icon, color, size }) => (
        <Link
          key={name}
          href={url}
          title={name}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center p-0.5 transition-transform hover:scale-125 focus:outline-none focus:ring-2 ${iconClassName}`}
        >
          <Icon
            size={size * iconSize}
            color={useColors ? color : "currentColor"}
          />
        </Link>
      ))}
    </nav>
  );
};
