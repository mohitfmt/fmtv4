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
  iconClassName = "",
  useColors = false,
}) => {
  const socialData = social.filter(
    (item) => item.name !== "Wikipedia" && item.name !== "Google News"
  );

  return (
    <nav
      className={`flex flex-wrap items-center ${className}`}
    >
      {socialData.map(({ name, url, icon: Icon, color }) => (
        <Link
          key={name}
          href={url}
          title={name}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center hover:opacity-80 transition-opacity"
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
