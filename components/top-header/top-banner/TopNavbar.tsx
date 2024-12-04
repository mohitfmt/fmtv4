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

  // Function to check if the item is active
  const isActive = (href: string) => {
    return router.pathname === href;
  };

  return (
    <nav className="border-b border-stone-400 py-2 px-4 font-semibold block overflow-x-scroll xl:overflow-x-clip relative">
      <ul className="flex justify-between px-3 items-center min-w-full">
        {navigation.map((item) => (
          <li key={item.id} className="group relative">
            <div className="flex items-center">
              <Link
                href={item.href}
                className={`font-bitter px-1 py-1 rounded-md text-md font-bold tracking-wide flex items-center ${
                  isActive(item.href) ? "bg-accent-blue text-white" : "hover:bg-accent-blue hover:text-white"
                }`}
              >
                {item.title}
                {item.items && (
                  <span className="ml-1 hidden xl:block hover:text-white">
                    {isActive(item.href) ? (
                      <CaretUp size={12} />
                    ) : (
                      <CaretDown size={12} />
                    )}
                  </span>
                )}
              </Link>
            </div>
            {item.items && (
              <ul
                className="absolute hidden lg:group-hover:block py-1 border border-stone-200 rounded-md bg-white dark:bg-secondary z-20 shadow-lg"
              >
                {item.items.map((subItem) => (
                  <li key={subItem.id}>
                    <Link
                      href={subItem.href}
                      className={`p-2 block whitespace-nowrap px-5 py-2 rounded-md text-stone-800 dark:text-stone-100 ${
                        isActive(subItem.href) ? "bg-accent-blue text-white" : "hover:bg-accent-blue hover:text-white"
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
