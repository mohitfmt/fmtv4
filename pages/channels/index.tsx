import React from "react";
import Link from "next/link";
import { social } from "@/constants/social";

interface SocialIconsProps {
  className?: string;
  iconClassName?: string;
  useColors?: boolean;
  iconSize?: number;
}

const Channels: React.FC<SocialIconsProps> = ({
  className = "",
  iconClassName = "",
  useColors = false,
  iconSize = 1,
}) => {
  return (
    <div>
      <h1 className="mt-4 mb-8 text-center text-4xl font-extrabold">
        Channels
      </h1>
      <nav
        className={`mt-8 flex flex-row flex-wrap justify-center items-center gap-4 ${className}`}
      >
        {social.map(({ name, url, icon: Icon, color, size }) => (
          <Link
            key={name}
            href={url}
            title={name}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex flex-col items-center justify-center gap-2 p-4 transition-transform hover:scale-110 focus:outline-none focus:ring-2 ${iconClassName}`}
          >
            <Icon
              size={iconSize * 50}
              color={useColors ? color : "currentColor"}
              className="mb-1"
            />
            <span className="text-sm font-medium">{name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Channels;
