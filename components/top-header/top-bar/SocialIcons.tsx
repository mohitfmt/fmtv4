import React from "react";
import Link from "next/link";
import { social } from "@/constants/social";

interface SocialIconsProps {
  className?: string;
  iconClassName?: string;
  useColors?: boolean;
}

export const SocialIcons: React.FC<SocialIconsProps> = ({
  className = "",
  iconClassName = "hover:text-accent-yellow",
  useColors = false,
}) => {
  return (
    <nav
      className={`flex flex-wrap flex-row items-center gap-y-2 md:gap-0.5 overflow-hidden ${className}`}
    >
      {social.map(({ name, url, icon: Icon, color }) => (
        <Link
          key={name}
          href={url}
          title={name}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center hover:opacity-80 transition-opacity px-0.5"
        >
          <Icon
            className={iconClassName}
            style={useColors ? { color } : undefined}
            weight="regular"
          />
        </Link>
      ))}
    </nav>
  );
};
