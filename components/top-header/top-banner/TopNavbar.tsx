import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDown, CaretUp } from "@phosphor-icons/react";

interface NavItem {
  id: number;
  title: string;
  href: string;
  items?: NavItem[];
}

interface Props {
  navigation: NavItem[];
}

const TopNavbar = ({ navigation }: Props) => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Special case for home route
    if (href === "/" && pathname === "/") return true;
    // For all other routes
    return pathname + "/" === href || pathname === href;
  };

  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    return item.items?.some(subItem => isActive(subItem.href)) || false;
  };

  return (
    <nav className="border-b border-stone-400 py-2 font-semibold block overflow-x-scroll lg:overflow-x-clip relative">
      <ul className="flex justify-start gap-1 items-center min-w-full text-lg ">
        {navigation.map((item) => (
          <li key={item.id} className="group relative">
            <div className="flex items-center">
              <Link
                href={item.href}
                className={`py-1 px-2.5 rounded-md font-semibold flex items-center ${
                  isParentActive(item)
                    ? "bg-accent-blue text-white"
                    : "hover:bg-accent-blue hover:text-white"
                }`}
              >
                {item.title}
                {/* {item.items && (
                  <span className="ml-1 hidden xl:block hover:text-white">
                    {isParentActive(item) ? (
                      <CaretUp size={12} />
                    ) : (
                      <CaretDown size={12} />
                    )}
                  </span>
                )} */}
              </Link>
            </div>
            {item.items && (
              <ul className="absolute hidden lg:group-hover:block py-1 border border-stone-200 rounded-md bg-white dark:bg-secondary z-20 shadow-lg">
                {item.items.map((subItem) => (
                  <li key={subItem.id}>
                    <Link
                      href={subItem.href}
                      className={`p-2 block whitespace-nowrap px-5 py-2 rounded-md text-stone-800 dark:text-stone-100 ${
                        isActive(subItem.href)
                          ? "bg-accent-blue text-white"
                          : "hover:bg-accent-blue hover:text-white"
                      }`}
                    >
                      {subItem.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TopNavbar;