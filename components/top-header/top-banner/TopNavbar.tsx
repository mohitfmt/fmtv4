import Link from "next/link";
import { useRouter } from "next/router";
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
  const router = useRouter();

  const normalizePath = (path: string) => path.replace(/\/$/, "");

  const isActive = (href: string) => {
    return normalizePath(router.pathname) === normalizePath(href);
  };

  const isParentActive = (items?: NavItem[]) => {
    return items?.some((item) => isActive(item.href));
  };

  return (
    <nav className="border-b border-gray-400 pt-3 pb-2 px-4 font-semibold hidden xl:block overflow-x-clip relative">
      <ul className="flex justify-between items-center min-w-full">
        {navigation.map((item) => (
          <li key={item.id} className="group relative">
            <div className="flex items-center">
              <Link
                href={item.href}
                className={`hover:bg-blue-600 hover:text-white px-2 py-0.5 rounded-md text-lg tracking-wide flex items-center ${isActive(item.href) || isParentActive(item.items)
                  ? "bg-blue-600 text-white"
                  : ""
                  }`}
              >
                {item.title}
                {item.items && (
                  <span className="ml-1  hover:text-white">
                    <CaretDown
                      size={12}
                      className="group-hover:hidden"
                    />
                    <CaretUp
                      size={12}
                      className="hidden group-hover:block"
                    />
                  </span>
                )}
              </Link>
            </div>
            {item.items && (
              <ul
                className="absolute hidden group-hover:block py-1 border border-gray-200 rounded-md 
                bg-white dark:bg-secondary z-50 shadow-lg"
              >
                {item.items.map((subItem) => (
                  <li key={subItem.id}>
                    <Link
                      href={subItem.href}
                      className={`hover:bg-blue-600 hover:text-white p-2 block whitespace-nowrap px-5 py-2 
                      text-gray-900 dark:text-gray-100 ${isActive(subItem.href) ? "bg-blue-600 text-white" : ""
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
