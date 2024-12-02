import React from "react";
import Link from "next/link";
import { LogoSVG } from "@/components/ui/icons/LogoSVG";
import { navigation } from "@/constants/navigation";
import { social } from "@/constants/social";

type NavItem = {
    id: number;
    title: string;
    href: string;
    items?: NavItem[];
};

const NavigationColumn: React.FC<{ items: NavItem[] }> = ({ items }) => (
    <div className="space-y-6">
        {items.map((item) => (
            <div key={item.id} className="space-y-3">
                <Link
                    href={item.href}
                    className="font-bold tracking-wider inline-block hover:text-yellow-400 hover:underline decoration-2 underline-offset-4"
                >
                    {item.title}
                </Link>
                {item.items && (
                    <div className="space-y-2">
                        {item.items.map((subItem) => (
                            <Link
                                key={subItem.id}
                                href={subItem.href}
                                className="block text-sm text-gray-300 hover:text-yellow-400 hover:underline decoration-1 underline-offset-2"
                            >
                                {subItem.title}
                            </Link>
                        ))}
                    </div>
                )}
                <hr className="border-t border-gray-500 my-2 w-[35%] sm:w-[70%] md:w-[30%] md:mx-0 mx-auto" />
            </div>
        ))}
    </div>
);

export default NavigationColumn;