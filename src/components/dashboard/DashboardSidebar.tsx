import { Home, Activity, Sparkles, FileText, MessageCircle, Settings, Clock, Bookmark } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const navItems = [
  { icon: Home, path: "/dashboard", label: "Home" },
  { icon: Activity, path: "/tracker", label: "Health Tracker" },
  { icon: Sparkles, path: "/insights", label: "AI Insights" },
  { icon: FileText, path: "/reports", label: "Reports" },
  { icon: Clock, path: "/wrap", label: "Monthly Wrap" },
  { icon: MessageCircle, path: "/chat", label: "Chat" },
  { icon: Bookmark, path: "/saved", label: "Saved" },
  { icon: Settings, path: "/settings", label: "Settings" },
];

const DashboardSidebar = () => {
  const location = useLocation();

  return (
    <div className="w-20 min-h-screen bg-card border-r border-border flex flex-col items-center py-6 gap-2 shrink-0">
      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-h3 mb-6">
        H
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ icon: Icon, path, label }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              title={label}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 ${
                active
                  ? "bg-primary-tint text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default DashboardSidebar;
