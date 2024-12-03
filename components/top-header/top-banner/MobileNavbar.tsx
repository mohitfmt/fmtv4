import { useState } from "react";
import { List, X, CaretDown, CaretUp } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/router";

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
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<{ [key: number]: boolean }>(
    {}
  );
  const router = useRouter();

  const isActive = (href: string) => router.pathname === href;

  const isParentActive = (items?: NavItem[]) =>
    items?.some((item) => isActive(item.href));

  const toggleExpand = (id: number) =>
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="relative block xl:hidden">
      {/* Menu Toggle Button */}
      <button
        className="text-2xl p-2 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <List size={24} />}
      </button>

      {/* Mobile Navigation Menu */}
      <div
        className={`z-20 w-[60%] lg:w-[30%] sm:w-[40%] fixed top-0 right-0 h-full bg-background text-foreground shadow-lg transform transition-transform duration-300 overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
   
      >
        {/* Close Icon */}
        <button
          className="fixed top-4 right-4 text-2xl focus:outline-none"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        >
          <X size={24} />
        </button>

        <ul className="flex flex-col p-6 space-y-4 mt-12">
          {navigation.map((item) => (
            <li key={item.id} className="relative group">
              <div className="flex justify-between items-center">
                <Link
                  href={item.href}
                  className={`block p-1 text-lg font-semibold ${
                    isActive(item.href) || isParentActive(item.items)
                      ? "bg-blue-600 text-white rounded"
                      : "hover:bg-blue-600 hover:text-white"
                  }`}
                  onClick={() => setIsOpen(false)} // Close menu on navigation
                >
                  {item.title}
                </Link>
                {item.items && (
                  <button
                    className="text-xl ml-2 focus:outline-none"
                    onClick={() => toggleExpand(item.id)}
                    aria-label="Expand or collapse submenu"
                  >
                    {expandedItems[item.id] ? (
                      <CaretUp size={20} />
                    ) : (
                      <CaretDown size={20} />
                    )}
                  </button>
                )}
              </div>
              {item.items && expandedItems[item.id] && (
                <ul className="pl-4 space-y-2">
                  {item.items.map((subItem) => (
                    <li key={subItem.id}>
                      <Link
                        href={subItem.href}
                        className={`block p-1 text-base ${
                          isActive(subItem.href)
                            ? "bg-blue-600 text-white"
                            : "hover:bg-blue-600 hover:text-white"
                        }`}
                        onClick={() => setIsOpen(false)} // Close menu on subitem navigation
                      >
                        {subItem.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}

          {/* Additional Items */}
          <li className="relative group">
            <button
              onClick={() => alert("Sign In functionality here")}
              className="block p-4 text-lg font-semibold hover:bg-blue-600 hover:text-white"
            >
              Sign In
            </button>
          </li>
        </ul>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default MobileNavbar;
