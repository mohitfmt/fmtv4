import React from "react";
import Link from "next/link";
import { LogoSVG } from "@/components/ui/icons/LogoSVG";
import { navigation } from "@/constants/navigation";
import NavigationColumn from "./NavigationColumn";
import FooterSocialIcons from "./FooterSocialIcons";
import CopyrightSection from "./CopyrightSection";
import FooterOtherLinks from "./FooterOtherLinks";

const Footer: React.FC = () => {
  const filteredNavigation = navigation.filter((item) => item.id !== 1);
  const singleNavItems = filteredNavigation.filter((item) => !item.items);
  const groupedNavItems = filteredNavigation.filter((item) => item.items);

  const columnData = [
    groupedNavItems.slice(0, 3),
    groupedNavItems.slice(4, 6),
    groupedNavItems.slice(3, 4).concat(groupedNavItems.slice(6)),
  ];

  return (
    <footer className="bg-stone-800 text-stone-100 pt-8 pb-2 z-8">
      <div className="container mx-auto md:px-1 px-2">
        {/* Logo Section */}
        <div className="flex flex-col lg:flex-row justify-between gap-8 border-b border-gray-700 pb-8">
          <div className="flex justify-center items-center lg:justify-start md:mb-4">
            <LogoSVG className="w-[200px] h-auto" />
          </div>

          {/* Navigation Grid */}
          <nav className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-x-12 gap-y-8 w-full lg:w-3/4 text-center sm:text-center md:text-left lg:text-left">
            {columnData.map((column, index) => (
              <NavigationColumn key={index} items={column} />
            ))}

            {/* Single Navigation Items */}
            <div className="space-y-4">
              {singleNavItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="font-bold tracking-wider block hover:text-yellow-400 hover:underline decoration-2 underline-offset-4"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        {/* Social Links*/}
        <FooterSocialIcons />

        {/* Footer Links: Defined Below */}
        <FooterOtherLinks />

        {/* Copyright Section: Defined Below*/}
        <CopyrightSection />
      </div>
    </footer>
  );
};

export default Footer;
