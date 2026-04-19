import { Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const DashboardHeader = () => {
  const [userData, setUserData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setUserData(snap.data());
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const firstName = userData?.fullName 
    ? userData.fullName.split(" ")[0] 
    : (auth.currentUser?.displayName?.split(" ")[0] || "User");

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-card border-b border-border">
      <div className="flex flex-1" />
      <div className="flex items-center gap-6">
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

        <div className="flex items-center gap-3 pl-4 border-l border-[#F3F4F6]">
          <div className="text-right hidden lg:block">
            <p className="text-[14px] font-bold text-[#1F2937] leading-tight">{userData?.fullName || auth.currentUser?.displayName || "User"}</p>
            <p className="text-[11px] text-muted-foreground font-medium">{userData?.broadHealthStage ? (userData.broadHealthStage.charAt(0).toUpperCase() + userData.broadHealthStage.slice(1)) : "Member"}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-rose-200 flex items-center justify-center text-primary font-bold">
            {firstName[0]}
          </div>
          <button 
            onClick={handleLogout}
            className="ml-2 p-2 rounded-xl text-[#9CA3AF] hover:bg-rose-50 hover:text-rose-500 transition-all"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
