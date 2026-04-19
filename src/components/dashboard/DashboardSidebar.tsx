import { Home, Activity, Sparkles, FileText, MessageCircle, Settings, Clock, Bookmark, Calendar as CalendarIcon } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const navItems = [
  { icon: Home, path: "/dashboard", label: "Home" },
  { icon: Activity, path: "/dashboard?tab=activity", label: "Health Tracker" },
  { icon: Sparkles, path: "/chat", label: "AI Insights" },
  { icon: CalendarIcon, path: "/dashboard?tab=calendar", label: "Health Calendar" },
  { icon: Clock, path: "/monthly-wrap", label: "Monthly Wrap" },
  { icon: Bookmark, path: "/dashboard?tab=saved", label: "Saved" },
  { icon: Settings, path: "/dashboard?tab=settings", label: "Settings" },
];

const mobileNavItems = [
  { icon: Home, path: "/dashboard", label: "Home" },
  { icon: Activity, path: "/dashboard?tab=activity", label: "Health Tracker" },
  { icon: Sparkles, path: "/chat", label: "AI Insights" },
  { icon: Bookmark, path: "/dashboard?tab=saved", label: "Saved" },
  { icon: Settings, path: "/dashboard?tab=settings", label: "Settings" },
];

const DashboardSidebar = () => {
  const location = useLocation();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-24 bg-card border-r border-border flex-col items-center py-6 shrink-0 z-50 h-screen sticky top-0">
        <Link to="/dashboard" className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-h3 mb-8 shadow-lg hover:scale-110 transition-transform">
          H
        </Link>
        <nav className="flex flex-col gap-5 flex-1 overflow-y-auto no-scrollbar pb-4">
          {navItems.map(({ icon: Icon, path, label }) => {
            const active = location.pathname.includes(path.split('?')[0]);
            return (
              <Link
                key={path}
                to={path}
                title={label}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 ${
                  active
                    ? "bg-rose-100 text-[#FF758C]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-[22px] h-[22px]" color={active ? "#FF758C" : "#9CA3AF"} />
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-[68px] bg-white border-t border-[#F3F4F6] flex items-center justify-between px-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] overflow-x-auto no-scrollbar gap-6">
        {mobileNavItems.map(({ icon: Icon, path, label }) => {
          const active = location.pathname.includes(path.split('?')[0]);
          return (
            <Link
              key={path}
              to={path}
              title={label}
              className="shrink-0"
            >
              <Icon className="w-[22px] h-[22px]" color={active ? "#FF758C" : "#9CA3AF"} />
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default DashboardSidebar;
