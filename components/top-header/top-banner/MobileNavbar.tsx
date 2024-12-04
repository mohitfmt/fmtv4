import { useEffect, useState } from "react";
import { List, X, CaretDown, CaretUp } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ThemeToggle } from "../top-bar/ThemeToggle";
import SignInButton from "../top-bar/SignInButton";
import { SocialIcons } from "../top-bar/SocialIcons";
import { useTheme } from "next-themes";


interface NavItem {
  id: number;
  title: string;
  href: string;
  items?: NavItem[];
}

interface Props {
  navigation: NavItem[];
}

const MobileNavbar = ({ navigation }: Props) => {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();


  useEffect(() => {
    setMounted(true);
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<{
    [key: number]: boolean;
  }>({});
  const router = useRouter();

  const isActive = (href: string) => router.pathname === href;

  const isParentActive = (items?: NavItem[]) =>
    items?.some((item) => isActive(item.href));

  const toggleExpand = (id: number) =>
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="relative block lg:hidden">
      {/* Menu Toggle Button */}
      <button
        className="text-2xl p-2 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <List size={24} />
      </button>

      {/* Mobile Navigation Menu */}
      <div
        className={`z-30 w-[80%] lg:w-[40%] sm:w-[60%] pb-10 fixed top-12 right-0 h-screen bg-background text-foreground shadow-lg transform transition-transform duration-300 overflow-y-scroll ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Top Bar */}
        <div className="flex justify-between px-4 items-center pt-5 pb-2 border-b border-stone-700">
          <div className="flex gap-2 capitalize items-center">
            <ThemeToggle />
            {mounted && (
              <span className="text-sm">
                {theme === 'system'
                  ? 'Auto'
                  : theme}
              </span>
            )}

            <div className="ml-3  flex gap-2 capitalize items-center">
              <SignInButton  />
              <span className="text-sm">SignIn</span>
            </div>

          </div>

          <button
            className="p-1 hover:bg-accent-yellow rounded-full transition-colors"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col justify-between">
          {/* Navigation Links */}
          <ul className="flex flex-col px-4 space-y-2 mt-4">
            {navigation.map((item) => (
              <li key={item.id} className="relative group">
                <div className="flex justify-between items-left">
                  <Link
                    href={item.href}
                    className={`block p-1 text-xl font-semibold ${isActive(item.href) || isParentActive(item.items)
                      ? "bg-accent-blue text-white rounded"
                      : "hover:bg-accent-blue  hover:text-white rounded"
                      }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.title}
                  </Link>
                  {item.items && (
                    <button
                      className="text-xl ml-2 focus:outline-none font-bold"
                      onClick={() => toggleExpand(item.id)}
                      aria-label="Expand or collapse submenu"
                    >
                      {expandedItems[item.id] ? (
                        <CaretUp size={16} />
                      ) : (
                        <CaretDown size={16} />
                      )}
                    </button>
                  )}
                </div>
                {item.items && expandedItems[item.id] && (
                  <ul className="pl-4 space-y-2 mt-2">
                    {item.items.map((subItem) => (
                      <li key={subItem.id}>
                        <Link
                          href={subItem.href}
                          className={`block p-1  text-md md:text-base  ${isActive(subItem.href)
                            ? "bg-accent-blue text-white rounded"
                            : "hover:bg-accent-blue hover:text-white rounded"
                            }`}
                          onClick={() => setIsOpen(false)}
                        >
                          {subItem.title}
                        </Link>
                      </li>
                    ))}
                    <p className="border-t py-2 border-stone-500 opacity-35"></p>
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/* Social Icons */}
          <div className="px-2 border-t py-2 border-stone-700 mt-6">
            <SocialIcons iconClassName="text-2xl" />
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-70 z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default MobileNavbar;
