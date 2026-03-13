import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, ClipboardList, Bell, BookOpen, Home, Users, LogOut, User, Settings, Moon, Sun, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/calendario", icon: Calendar, label: "Calendário" },
  { to: "/avisos", icon: Bell, label: "Avisos" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro" },
];

const moreItems = [
  { to: "/escalas", icon: ClipboardList, label: "Escalas" },
  { to: "/estudos", icon: BookOpen, label: "Estudos" },
];

const adminItems = [
  { to: "/admin/membros", icon: Users, label: "Membros" },
];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, profile, signOut } = useAuth();
  const location = useLocation();
  const { isDark, toggle } = useTheme();

  const allDesktopItems = [...navItems, ...moreItems, ...(isAdmin ? adminItems : [])];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-tusva.jpg" alt="TUSVA" className="w-8 h-8 rounded-full object-cover" loading="eager" />
            <span className="font-display text-sm text-primary hidden sm:inline">TUSVA</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {allDesktopItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  location.pathname === item.to
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Alternar tema">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/perfil" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">{profile?.nome?.split(" ")[0]}</span>
            </Link>
            <button onClick={signOut} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-4">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="flex items-center justify-around px-1 py-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[10px] transition-colors min-w-[3rem]",
                location.pathname === item.to
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin/membros"
              className={cn(
                "flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[10px] transition-colors min-w-[3rem]",
                location.pathname.startsWith("/admin")
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <Settings className="w-5 h-5" />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
};
