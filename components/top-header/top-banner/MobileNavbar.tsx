import { useEffect, useState } from "react";
import { FaAngleDown, FaAngleUp, FaBars, FaTimes } from "react-icons/fa";
import Link from "next/link";
import { ThemeToggle } from "../top-bar/ThemeToggle";
import { SocialIcons } from "../top-bar/SocialIcons";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import UserAuthControl from "../top-bar/UserAuthControl";

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
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<{
    [key: number]: boolean;
  }>({});
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Navigation helpers
  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    return pathname + "/" === href || pathname === href;
  };

  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    return item.items?.some((subItem) => isActive(subItem.href)) || false;
  };

  const toggleExpand = (id: number) =>
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="relative block lg:hidden">
      {/* Menu Toggle Button */}
      <button
        className="text-2xl py-2 ml-2 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <FaBars size={24} />
      </button>

      {/* Mobile Menu Panel */}
      <div
        className={`z-30 w-[80%] lg:w-[40%] sm:w-[60%] pb-10 fixed top-10 right-0 h-screen bg-background text-foreground shadow-lg transform transition-transform duration-300 overflow-y-scroll ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header Section */}
        <div className="flex justify-between pr-2 pl-4 items-center pt-5 pb-2 border-b border-stone-700">
          <div className="flex gap-2 capitalize items-center">
            {/* Theme Toggle */}
            <ThemeToggle />
            {mounted && (
              <span className="text-sm">
                {theme === "system" ? "Auto" : theme}
              </span>
            )}

            {/* Authentication Section */}
            <div className="ml-3 flex gap-2 capitalize items-center">
              <UserAuthControl />
              <span className="text-sm">
                {isAuthenticated ? "Sign Out" : "Sign In"}
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            className="p-1 hover:bg-accent-yellow rounded-full transition-colors"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex flex-col justify-between ">
          {/* Navigation Links */}
          <ul className="flex flex-col px-4 py-2 space-y-2 my-2 border-b border-stone-700 ">
            {navigation.map((item) => (
              <li key={item.id} className="relative group">
                <div className="flex justify-between items-center">
                  <Link
                    href={item.href}
                    className={`block p-1 text-xl font-semibold ${
                      isParentActive(item)
                        ? "bg-accent-blue text-white rounded"
                        : "hover:bg-accent-blue hover:text-white rounded"
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
                        <FaAngleUp size={16} />
                      ) : (
                        <FaAngleDown size={16} />
                      )}
                    </button>
                  )}
                </div>

                {/* Submenu Items */}
                {item.items && expandedItems[item.id] && (
                  <ul className="pl-4 space-y-2 mt-2">
                    {item.items.map((subItem) => (
                      <li key={subItem.id}>
                        <Link
                          href={subItem.href}
                          className={`block p-1 text-md md:text-base ${
                            isActive(subItem.href)
                              ? "bg-accent-blue text-white rounded"
                              : "hover:bg-accent-blue hover:text-white rounded"
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          {subItem.title}
                        </Link>
                      </li>
                    ))}
                    <div className="border-t border-stone-500 opacity-35 my-2" />
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/* Social Icons Footer */}
          <div className="px-2  ml-1 pb-[80px] ">
            <SocialIcons
              iconClassName="text-3xl hover:text-accent-yellow justify-left"
              className="flex gap-1"
            />
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-70"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default MobileNavbar;
