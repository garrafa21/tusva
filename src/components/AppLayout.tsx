import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  ClipboardList,
  Bell,
  BookOpen,
  Home,
  Users,
  LogOut,
  Settings,
  Moon,
  Sun,
  DollarSign,
  HandHeart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { UserAvatar } from "@/components/UserAvatar";

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/calendario", icon: Calendar, label: "Calendário" },
  { to: "/firmezas", icon: HandHeart, label: "Firmezas" },
  { to: "/avisos", icon: Bell, label: "Avisos" },
  { to: "/estudos", icon: BookOpen, label: "Estudos" },
];

const moreItems = [
  { to: "/escalas", icon: ClipboardList, label: "Escalas" },
];

const adminItems = [{ to: "/admin/membros", icon: Users, label: "Membros" }];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, profile, signOut } = useAuth();
  const location = useLocation();
  const { isDark, toggle } = useTheme();

  const allDesktopItems = [...navItems, ...moreItems, ...(isAdmin ? adminItems : [])];

  // Mobile bottom nav: 5 itens principais
  const mobileItems = navItems;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-xl">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="flex items-center justify-between px-4 h-14 max-w-6xl mx-auto">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gold/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src="/logo-tusva.jpg"
                alt="TUSVA"
                className="relative w-9 h-9 rounded-full object-cover ring-1 ring-gold/40 shadow-glow-gold"
                loading="eager"
              />
            </div>
            <span className="font-display text-base text-gradient-vinho hidden sm:inline tracking-wider">TUSVA</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {allDesktopItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                    active
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-1 left-3 right-3 h-0.5 bg-gradient-gold rounded-full animate-fade-in" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Alternar tema"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              to="/perfil"
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-secondary transition-colors"
            >
              <UserAvatar
                name={profile?.nome}
                src={profile?.avatar_url}
                size="sm"
                ring={isAdmin ? "gold" : "none"}
              />
              <span className="text-xs text-muted-foreground hidden sm:inline max-w-[120px] truncate">
                {profile?.nome}
              </span>
            </Link>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="flex items-center justify-around px-1 py-1.5">
          {mobileItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] transition-all min-w-[3rem]",
                  active ? "text-primary font-semibold" : "text-muted-foreground",
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
                <span className="truncate">{item.label}</span>
                {active && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-gold rounded-full animate-fade-in" />
                )}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin/membros"
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] transition-all min-w-[3rem]",
                location.pathname.startsWith("/admin") ? "text-primary font-semibold" : "text-muted-foreground",
              )}
            >
              <Settings className="w-5 h-5" />
              <span>Admin</span>
              {location.pathname.startsWith("/admin") && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-gold rounded-full animate-fade-in" />
              )}
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
};
