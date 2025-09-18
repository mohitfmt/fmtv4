// components/admin/MobileNav.tsx
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import {
  motion,
  AnimatePresence,
  LazyMotion,
  domAnimation,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

// Icons
import {
  FiHome,
  FiSettings,
  FiList,
  FiRefreshCw,
  FiDatabase,
  FiMenu,
  FiX,
  FiSun,
  FiMoon,
  FiMonitor,
  FiLogOut,
  FiUser,
} from "react-icons/fi";
import Image from "next/image";

interface MobileNavProps {
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const bottomNavItems = [
  { href: "/video-admin", icon: FiHome, label: "Dashboard" },
  { href: "/video-admin/playlists", icon: FiList, label: "Playlists" },
  { href: "/video-admin/sync", icon: FiRefreshCw, label: "Sync" },
  { href: "/video-admin/configuration", icon: FiSettings, label: "Settings" },
];

const drawerItems = [
  { href: "/video-admin/cache", icon: FiDatabase, label: "Cache Management" },
];

export default function MobileNav({ isRefreshing, onRefresh }: MobileNavProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Close drawer on route change
    const handleRouteChange = () => setIsDrawerOpen(false);
    router.events.on("routeChangeStart", handleRouteChange);
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  const handleSignOut = () => {
    sessionStorage.setItem("admin_signed_out", "true");
    signOut({ callbackUrl: "/video-admin/login" });
  };

  const getThemeIcon = () => {
    if (!mounted) return FiSun;
    if (resolvedTheme === "dark") return FiMoon;
    if (resolvedTheme === "light") return FiSun;
    return FiMonitor;
  };

  const ThemeIcon = getThemeIcon();

  const cycleTheme = () => {
    const themes = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme || "system");
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <LazyMotion features={domAnimation}>
      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-md border-b border-border z-40">
        <div className="flex items-center justify-between h-full px-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
            aria-label="Open menu"
          >
            <FiMenu className="w-5 h-5" />
          </button>

          <h1 className="text-lg font-semibold">Video Admin</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={cycleTheme}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label={`Switch to ${theme === "dark" ? "light" : theme === "light" ? "system" : "dark"} theme`}
            >
              <ThemeIcon className="w-5 h-5" />
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className={cn(
                  "p-2 rounded-lg hover:bg-muted/50 transition-colors",
                  isRefreshing && "opacity-50 cursor-not-allowed"
                )}
                aria-label="Refresh dashboard"
                aria-busy={isRefreshing}
                aria-live="polite"
              >
                <FiRefreshCw
                  className={cn("w-5 h-5", isRefreshing && "animate-spin")}
                />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40">
        <div className="flex items-center justify-around h-full px-2">
          {bottomNavItems.map((item) => {
            const isActive = router.pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 rounded-lg transition-colors",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive && "text-primary"
                )}
              >
                <Icon
                  className={cn("w-5 h-5 mb-1", isActive && "text-primary")}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Drawer/Side Sheet */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsDrawerOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-card shadow-xl z-50"
            >
              <div className="flex flex-col h-full">
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    {session?.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="w-10 h-10 rounded-full border-2 border-primary/20"
                        width={40}
                        height={40}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <FiUser className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">
                        {session?.user?.name || "Admin"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session?.user?.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 -mr-2 rounded-lg hover:bg-muted/50 transition-colors"
                    aria-label="Close menu"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Menu Items */}
                <div className="flex-1 overflow-y-auto py-4">
                  <div className="px-4 mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Additional Tools
                    </p>
                    {drawerItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = router.pathname === item.href;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1",
                            "hover:bg-muted/50",
                            isActive && "bg-muted text-primary"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Theme Selector in Drawer */}
                  <div className="px-4 mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Appearance
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "light", icon: FiSun, label: "Light" },
                        { value: "dark", icon: FiMoon, label: "Dark" },
                        { value: "system", icon: FiMonitor, label: "System" },
                      ].map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          onClick={() => setTheme(value)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                            "hover:bg-muted/50",
                            theme === value && "bg-muted text-primary"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[10px] font-medium">
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-border">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-red-600 dark:text-red-400"
                  >
                    <FiLogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
