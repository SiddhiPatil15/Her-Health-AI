import { Search, Bell, ChevronDown } from "lucide-react";

const DashboardHeader = () => {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-card border-b border-border">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            className="pl-10 pr-4 py-2 bg-muted rounded-xl text-body text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-primary/20 w-48"
          />
        </div>

        <button className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-2 cursor-pointer">
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-caption font-semibold">
            ET
          </div>
          <span className="text-body font-medium text-foreground">Emma T.</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
