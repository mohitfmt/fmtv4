import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { LogoSVG } from "@/components/ui/icons/LogoSVG";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Settings,
  List,
  RefreshCw,
  Database,
  Home,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export default function AdminLayout({
  children,
  title,
  description,
}: AdminLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = () => {
    sessionStorage.setItem("admin_signed_out", "true");
    signOut({ callbackUrl: "/video-admin/login" });
  };

  const navItems = [
    { href: "/video-admin", icon: Home, label: "Dashboard" },
    {
      href: "/video-admin/configuration",
      icon: Settings,
      label: "Configuration",
    },
    { href: "/video-admin/playlists", icon: List, label: "Playlists" },
    { href: "/video-admin/sync", icon: RefreshCw, label: "Sync Control" },
    { href: "/video-admin/cache", icon: Database, label: "Cache" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/video-admin">
              <LogoSVG className="h-8 cursor-pointer" />
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold text-foreground">
              Video Admin
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex mx-auto">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-card border-r border-border min-h-[calc(100vh-4rem)]">
          <div className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                      isActive
                        ? "bg-accent text-foreground"
                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground">{title}</h2>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}

            {/* Page Content */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
