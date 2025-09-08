import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { LogoSVG } from "@/components/ui/icons/LogoSVG";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FiLogOut,
  FiSettings,
  FiList,
  FiRefreshCw,
  FiDatabase,
  FiHome,
  FiChevronRight,
  FiSun,
  FiMoon,
  FiMonitor,
} from "react-icons/fi";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

// Animation variants with proper typing
const headerVariants: Variants = {
  initial: { y: -20, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

const sidebarVariants: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
      staggerChildren: 0.1,
    },
  },
};

const navItemVariants: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  hover: {
    x: 4,
    transition: { duration: 0.2 },
  },
};

const contentVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 },
  },
};

// Theme Toggle Component
function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />;
  }

  const themes = [
    { value: "light", icon: FiSun, label: "Light" },
    { value: "dark", icon: FiMoon, label: "Dark" },
    { value: "system", icon: FiMonitor, label: "System" },
  ];

  const currentTheme = themes.find((t) => t.value === theme) || themes[2];
  const Icon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 30, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
          </AnimatePresence>
          <span className="sr-only">Toggle theme</span>
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {themes.map(({ value, icon: ThemeIcon, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "cursor-pointer flex items-center gap-2",
              theme === value && "bg-accent"
            )}
          >
            <ThemeIcon className="w-4 h-4" />
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminLayout({
  children,
  title,
  description,
}: AdminLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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

  return (
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

      {/* Header */}
      <motion.header
        variants={headerVariants}
        initial="initial"
        animate="animate"
        className="bg-card shadow-sm border-b border-border sticky top-0 z-50 backdrop-blur-md bg-card/95"
      >
        <div className="mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/video-admin">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <LogoSVG className="h-8 cursor-pointer" />
              </motion.div>
            </Link>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 24 }}
              transition={{ delay: 0.2 }}
              className="w-px bg-border"
            />
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-semibold text-foreground"
            >
              Video Admin
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3"
          >
            <motion.span
              className="text-sm text-muted-foreground hidden sm:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {session?.user?.email}
            </motion.span>

            <ThemeToggle />

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200 dark:hover:border-red-800 transition-all"
              >
                <FiLogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>

      <div className="flex mx-auto">
        {/* Sidebar Navigation */}
        <motion.nav
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="w-64 bg-card border-r border-border min-h-[calc(100vh-4rem)]"
        >
          <div className="p-4 space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;

              return (
                <motion.div
                  key={item.href}
                  variants={navItemVariants}
                  custom={index}
                  whileHover="hover"
                >
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer relative overflow-hidden",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {/* Hover ripple effect */}
                      {!isActive && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-600/5"
                          initial={{ x: "-100%" }}
                          whileHover={{ x: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}

                      <motion.div
                        animate={{ scale: isActive ? 1.1 : 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Icon className="w-5 h-5 relative z-10" />
                      </motion.div>

                      <span className="font-medium relative z-10">
                        {item.label}
                      </span>

                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="ml-auto"
                          >
                            <FiChevronRight className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.nav>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-hidden">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <h2 className="text-3xl font-bold text-foreground">{title}</h2>
            {description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground mt-1"
              >
                {description}
              </motion.p>
            )}
          </motion.div>

          {/* Page Content with Animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={router.pathname}
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
