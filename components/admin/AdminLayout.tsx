// components/admin/AdminLayout.tsx
import { useState, useEffect, ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import {
  motion,
  AnimatePresence,
  LazyMotion,
  domAnimation,
} from "framer-motion";
import { useTheme } from "next-themes";
import MobileNav from "./MobileNav";

// Icons
import {
  FiHome,
  FiSettings,
  FiList,
  FiRefreshCw,
  FiDatabase,
  FiLogOut,
  FiUser,
  FiSun,
  FiMoon,
  FiMonitor,
  FiChevronRight,
} from "react-icons/fi";
import Image from "next/image";

// Logo component (simplified version)
const LogoSVG = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      width="40"
      height="40"
      rx="8"
      fill="currentColor"
      className="text-primary"
    />
    <path d="M12 20L18 14V26L12 20Z" fill="white" />
    <path d="M22 14H28V16H22V14Z" fill="white" />
    <path d="M22 19H26V21H22V19Z" fill="white" />
    <path d="M22 24H28V26H22V24Z" fill="white" />
  </svg>
);

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

// Theme Toggle Component for Desktop
function DesktopThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes = [
    { value: "light", icon: FiSun, label: "Light" },
    { value: "dark", icon: FiMoon, label: "Dark" },
    { value: "system", icon: FiMonitor, label: "System" },
  ];

  const currentTheme = themes.find((t) => t.value === (theme || "system"));
  const Icon = currentTheme?.icon || FiSun;

  return (
    <div className="relative group">
      <button
        onClick={() => {
          const currentIndex = themes.findIndex(
            (t) => t.value === (theme || "system")
          );
          const nextIndex = (currentIndex + 1) % themes.length;
          setTheme(themes[nextIndex].value);
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        )}
        aria-label={`Current theme: ${currentTheme?.label}. Click to change.`}
      >
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{currentTheme?.label}</span>
      </button>

      {/* Tooltip */}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Click to cycle themes
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
  title,
  description,
  isRefreshing,
  onRefresh,
}: AdminLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSignOut = () => {
    sessionStorage.setItem("admin_signed_out", "true");
    signOut({ callbackUrl: "/video-admin/login" });
  };

  const navItems = [
    { href: "/video-admin", icon: FiHome, label: "Dashboard" },
    {
      href: "/video-admin/configuration",
      icon: FiSettings,
      label: "Configuration",
    },
    { href: "/video-admin/playlists", icon: FiList, label: "Playlists" },
    { href: "/video-admin/sync", icon: FiRefreshCw, label: "Sync Control" },
    { href: "/video-admin/cache", icon: FiDatabase, label: "Cache" },
  ];

  // Show loading state when navigating
  useEffect(() => {
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  // Load sidebar preference
  useEffect(() => {
    const savedState = localStorage.getItem("admin-sidebar-collapsed");
    if (savedState !== null) {
      setIsSidebarCollapsed(savedState === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem("admin-sidebar-collapsed", String(newState));
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-background">
        {/* Loading Bar */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 z-[100] origin-left"
            />
          )}
        </AnimatePresence>

        {/* Mobile Navigation */}
        <MobileNav isRefreshing={isRefreshing} onRefresh={onRefresh} />

        {/* Desktop Layout */}
        <div className="hidden lg:flex h-screen">
          {/* Desktop Sidebar */}
          <aside
            className={cn(
              "bg-card border-r border-border transition-all duration-300 flex flex-col",
              isSidebarCollapsed ? "w-16" : "w-64"
            )}
          >
            {/* Sidebar Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
              {!isSidebarCollapsed && (
                <Link href="/video-admin" className="flex items-center gap-3">
                  <LogoSVG className="h-8 w-8" />
                  <span className="font-semibold text-lg">Video Admin</span>
                </Link>
              )}
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                aria-label={
                  isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
              >
                <FiChevronRight
                  className={cn(
                    "w-5 h-5 transition-transform",
                    !isSidebarCollapsed && "rotate-180"
                  )}
                />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                      "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isActive && "bg-muted text-primary font-medium",
                      isSidebarCollapsed && "justify-center"
                    )}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn("w-5 h-5", isActive && "text-primary")}
                    />
                    {!isSidebarCollapsed && (
                      <span className="text-sm">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-border">
              {/* User Info */}
              {session?.user && !isSidebarCollapsed && (
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <FiUser className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 rounded-lg",
                  "hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors",
                  isSidebarCollapsed && "justify-center"
                )}
                title={isSidebarCollapsed ? "Sign Out" : undefined}
              >
                <FiLogOut className="w-5 h-5" />
                {!isSidebarCollapsed && (
                  <span className="text-sm font-medium">Sign Out</span>
                )}
              </button>
            </div>
          </aside>

          {/* Desktop Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Desktop Header */}
            <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
              <div>
                {title && <h1 className="text-xl font-semibold">{title}</h1>}
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Theme Toggle - More Prominent on Desktop */}
                <DesktopThemeToggle />

                {/* Refresh Button if provided */}
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
                      "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isRefreshing && "opacity-50 cursor-not-allowed"
                    )}
                    aria-label="Refresh"
                    aria-busy={isRefreshing}
                    aria-live="polite"
                  >
                    <FiRefreshCw
                      className={cn("w-4 h-4", isRefreshing && "animate-spin")}
                    />
                    <span className="text-sm font-medium">
                      {isRefreshing ? "Refreshing..." : "Refresh"}
                    </span>
                  </button>
                )}
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>

        {/* Mobile Layout - Content Area */}
        <div className="lg:hidden">
          <main className="pt-14 pb-16 px-4">
            {/* Mobile Page Header */}
            {title && (
              <div className="mb-4">
                <h1 className="text-xl font-semibold">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {description}
                  </p>
                )}
              </div>
            )}

            {children}
          </main>
        </div>
      </div>
    </LazyMotion>
  );
}
