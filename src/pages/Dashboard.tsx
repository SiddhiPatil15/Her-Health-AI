import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Activity, 
  Heart, 
  Moon, 
  Scale, 
  LogOut, 
  Bell, 
  User as UserIcon,
  Sparkles,
  TrendingUp,
  Brain,
  Search,
  Plus,
  Home,
  BarChart2,
  Settings,
  HelpCircle,
  MessageCircle,
  Send,
  Droplets,
  Calendar,
  Clock,
  ChevronRight
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { toast } from "sonner";
import RiskPredictionCard from "@/components/dashboard/RiskPredictionCard";

const progressData = [
  { name: 'Week 1', value: 55 },
  { name: 'Week 2', value: 62 },
  { name: 'Week 3', value: 58 },
  { name: 'Week 4', value: 70 },
  { name: 'Week 5', value: 72 },
  { name: 'Week 6', value: 68 },
  { name: 'Week 7', value: 75 },
];

const Dashboard = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [chatMessage, setChatMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("Dashboard: Auth state changed", user?.email);
      if (user) {
        // Set up real-time listener for user data
        const docRef = doc(db, "users", user.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            console.log("Dashboard: Data update from Firestore", docSnap.data());
            setUserData(docSnap.data());
          } else {
            console.log("Dashboard: No Firestore document found");
            setUserData({ 
              fullName: user.displayName || user.email?.split('@')[0] || "User",
              email: user.email,
              onboardingCompleted: false
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Dashboard: Firestore error", error);
          toast.error("Error connecting to database");
          setLoading(false);
        });
      } else {
        console.log("Dashboard: No authenticated user");
        navigate("/login");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  // Removed handleSendMessage function to replace it with real navigation to /chat

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCFD] space-y-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-muted-foreground font-medium">Getting things ready...</p>
    </div>
  );

  const firstName = userData?.fullName?.split(' ')[0] || "User";

  // Dynamic Score Calculation
  const calculateDynamicScores = () => {
    if (!userData) return { health: 72, activity: 65, sleep: 70 };

    // Activity Score
    const activityMap = { sedentary: 30, light: 55, moderate: 80, very: 95 };
    const activityScore = activityMap[userData.activityLevel as keyof typeof activityMap] || 60;

    // Sleep Score (Target 8 hours)
    const sleepHours = Number(userData.sleepHours || 7);
    const sleepScore = Math.max(0, 100 - Math.abs(8 - sleepHours) * 15);

    // Baseline Health Score (0-100)
    // Risk score is 0-100 (higher is bad), so health is 100 - risk
    const aiRiskScore = userData.latestRisk?.riskScore ?? 30; // fallback or default
    const healthScore = Math.round(100 - aiRiskScore);

    return { 
      health: Math.max(10, healthScore), 
      activity: activityScore, 
      sleep: Math.round(sleepScore) 
    };
  };

  const scores = calculateDynamicScores();

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <DashboardHome 
            userData={userData} 
            firstName={firstName} 
            setActiveTab={setActiveTab}
            scores={scores}
          />
        );
      case "activity":
        return <ActivityTrackerView setActiveTab={setActiveTab} />;
      case "health":
        return <HealthMetricsView setActiveTab={setActiveTab} />;
      case "stats":
        return <AnalyticsTrendsView setActiveTab={setActiveTab} />;
      case "clock":
        return <HistoryScheduleView setActiveTab={setActiveTab} />;
      case "messages":
        return <ExpertConsultationsView setActiveTab={setActiveTab} />;
      case "settings":
        return <PlaceholderView title="Profile Settings" icon={<Settings className="w-12 h-12 text-gray-500" />} />;
      default:
        return <DashboardHome userData={userData} firstName={firstName} setActiveTab={setActiveTab} scores={scores} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#FDFCFD] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 lg:w-24 bg-white border-r border-[#F3F4F6] flex flex-col items-center py-8 z-50">
        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold mb-12 shadow-lg cursor-pointer transition-transform hover:scale-110" onClick={() => setActiveTab("home")}>
          H
        </div>
        <nav className="flex-1 flex flex-col gap-6 lg:gap-8">
          <SidebarIcon 
            icon={<Home size={22} color={activeTab === "home" ? "#FF758C" : "#9CA3AF"} />} 
            active={activeTab === "home"} 
            onClick={() => setActiveTab("home")}
          />
          <SidebarIcon 
            icon={<Activity size={22} color={activeTab === "activity" ? "#FF758C" : "#9CA3AF"} />} 
            active={activeTab === "activity"} 
            onClick={() => setActiveTab("activity")}
          />
          <SidebarIcon 
            icon={<Heart size={22} color={activeTab === "health" ? "#FF758C" : "#9CA3AF"} />} 
            active={activeTab === "health"} 
            onClick={() => setActiveTab("health")}
          />
          <SidebarIcon 
            icon={<BarChart2 size={22} color={activeTab === "stats" ? "#FF758C" : "#9CA3AF"} />} 
            active={activeTab === "stats"} 
            onClick={() => setActiveTab("stats")}
          />
          <SidebarIcon 
            icon={<Clock size={22} color={activeTab === "clock" ? "#FF758C" : "#9CA3AF"} />} 
            active={activeTab === "clock"} 
            onClick={() => setActiveTab("clock")}
          />
          <SidebarIcon 
            icon={<MessageCircle size={22} color={activeTab === "messages" ? "#FF758C" : "#9CA3AF"} />} 
            active={activeTab === "messages"} 
            onClick={() => setActiveTab("messages")}
          />
          <SidebarIcon 
            icon={<Brain size={22} color="#9CA3AF" />} 
            active={false} 
            onClick={() => window.location.href = '/chat'}
          />
          <SidebarIcon 
            icon={<Settings size={22} color={activeTab === "settings" ? "#FF758C" : "#9CA3AF"} />} 
            active={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")}
          />
        </nav>
        
        <button 
          onClick={handleLogout}
          className="p-3 rounded-2xl text-[#9CA3AF] hover:bg-rose-50 hover:text-rose-500 transition-all duration-300 mb-4"
        >
          <LogOut size={22} />
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-[#F3F4F6] sticky top-0 z-40">
          <button 
            onClick={() => toast.info("Appointment section coming soon!")}
            className="px-6 py-2.5 bg-[#FF758C] text-white rounded-full font-semibold text-[14px] hover:shadow-lg hover:shadow-rose-100 transition-all active:scale-95"
          >
            Make An Appointment
          </button>
          
          <div className="flex items-center gap-6">
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search health records..." 
                className="bg-[#F3F4F6] border-none rounded-full py-2.5 pl-12 pr-6 text-[14px] w-72 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="relative cursor-pointer hover:bg-rose-50 p-2.5 rounded-full transition-colors group">
              <Bell className="w-5 h-5 text-[#4B5563] group-hover:text-primary transition-colors" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-[#F3F4F6]">
              <div className="text-right hidden lg:block">
                <p className="text-[14px] font-bold text-[#1F2937] leading-tight">{userData?.fullName || "User"}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{userData?.broadHealthStage ? (userData.broadHealthStage.charAt(0).toUpperCase() + userData.broadHealthStage.slice(1)) : "Member"}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-rose-200 flex items-center justify-center text-primary font-bold">
                {firstName[0]}
              </div>
            </div>
          </div>
        </header>

        {renderTabContent()}
      </div>
    </div>
  );
};

const DashboardHome = ({ userData, firstName, setActiveTab, scores }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-8 lg:grid lg:grid-cols-12 gap-8 max-w-[1600px] mx-auto w-full"
  >
    {/* Main Area */}
    <div className="lg:col-span-8 space-y-8">
      {/* Hero Welcome */}
      <div className="bg-[#FFE4E8] rounded-[40px] p-10 flex items-center justify-between relative overflow-hidden h-[240px] group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/30 transition-all duration-700"></div>
        <div className="z-10 space-y-4 max-w-[60%]">
          <h1 className="text-[36px] font-bold text-[#1F2937]">Hope you're doing well {firstName}!</h1>
          <p className="text-[#6B7280] text-[16px] leading-relaxed font-medium">We have curated health insights for you.</p>
          <div className="pt-2">
            <span onClick={() => setActiveTab("stats")} className="text-primary font-bold text-[15px] border-b-2 border-primary cursor-pointer hover:pb-1 transition-all">View Insights ➜</span>
          </div>
        </div>
        <div className="absolute right-10 bottom-0 top-0 w-[40%] flex items-end">
           <img 
            src="https://img.freepik.com/free-vector/thoughtful-woman-concept-illustration_114360-1412.jpg" 
            className="w-full object-contain object-bottom h-[90%] mix-blend-multiply" 
            alt="Welcome Illustration" 
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MiniStatCard 
          icon={<Heart className="w-5 h-5 text-rose-500" />}
          label="Health Score"
          value={scores.health.toString()}
          trend="+5% this week"
          color="bg-rose-50"
          trendColor="text-emerald-500"
        />
        <MiniStatCard 
          icon={<Activity className="w-5 h-5 text-blue-500" />}
          label="Activity Score"
          value={scores.activity.toString()}
          trend="+12%"
          color="bg-blue-50"
          trendColor="text-emerald-500"
        />
        <MiniStatCard 
          icon={<Moon className="w-5 h-5 text-purple-500" />}
          label="Sleep Score"
          value={scores.sleep.toString()}
          trend="+8%"
          color="bg-purple-50"
          trendColor="text-emerald-500"
        />
      </div>

      {/* Middle Section Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Health Rate Circle */}
        <div className="bg-white p-8 rounded-[40px] border border-[#F3F4F6] shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-h3 font-bold mb-8">Health Rate</h3>
          <div className="flex flex-col items-center">
             <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="96" cy="96" r="88" fill="transparent" stroke="#FEE2E2" strokeWidth="12" />
                  <circle cx="96" cy="96" r="88" fill="transparent" stroke="#FF758C" strokeWidth="12" strokeDasharray="552.92" strokeDashoffset={552.92 * (1 - scores.health / 100)} strokeLinecap="round" />
                </svg>
                <div className="absolute text-center">
                   <p className="text-[42px] font-bold text-[#1F2937]">{scores.health}%</p>
                   <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wider">Improving</p>
                </div>
             </div>
             <div className="flex gap-6 mt-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary shadow-sm shadow-primary/40"></div>
                  <span className="text-[14px] text-muted-foreground font-medium">Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10B981] shadow-sm shadow-emerald-400/40"></div>
                  <span className="text-[14px] text-muted-foreground font-medium">Progressing</span>
                </div>
             </div>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="bg-white p-8 rounded-[40px] border border-[#F3F4F6] shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-h3 font-bold mb-8">Overall Progress</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF758C" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#FF758C" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#FF758C" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-4 px-2">
              {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'].map(w => (
                <span key={w} className="text-[11px] text-[#9CA3AF] font-bold">{w}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] flex flex-col justify-between h-[180px] hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-caption text-muted-foreground font-bold">Current Weight</p>
              <p className="text-[28px] font-bold text-[#1F2937]">{userData?.weightKg || "65"} kg</p>
            </div>
            <p className="text-[12px] text-emerald-500 font-bold">Target: {userData?.weightKg ? userData.weightKg - 2 : "60"} kg</p>
         </div>
         <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] flex flex-col justify-between h-[180px] hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Scale className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-caption text-muted-foreground font-bold">BMI Index</p>
              <p className="text-[28px] font-bold text-[#1F2937]">
                {userData?.weightKg && userData?.heightCm 
                  ? (userData.weightKg / Math.pow(userData.heightCm / 100, 2)).toFixed(1) 
                  : "22.4"}
              </p>
            </div>
            <p className="text-[12px] text-emerald-500 font-bold">Normal Range</p>
         </div>
         <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] flex flex-col justify-between h-[180px] hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                <Droplets className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-caption text-muted-foreground font-bold">Hydration</p>
              <p className="text-[28px] font-bold text-[#1F2937]">{userData?.weightKg ? (userData.weightKg * 0.033).toFixed(1) : "2.1"}L / day</p>
            </div>
            <p className="text-[12px] text-slate-400 font-bold">Daily Goal</p>
         </div>
      </div>
    </div>

    {/* Right Sidebar Section */}
    <div className="lg:col-span-4 space-y-8">
      {/* AI Risk Prediction Card */}
      <RiskPredictionCard userData={userData} />

      {/* Details Section */}
      <section className="bg-white p-8 rounded-[40px] border border-[#F3F4F6] shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-h3 font-bold">Details</h3>
          <button className="p-2 hover:bg-rose-50 rounded-lg transition-colors text-[#9CA3AF] hover:text-primary">
             <Settings className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-6">
          <DetailRow label="Exact Age" value={userData?.age ? `${userData.age} Years` : "Not set"} />
          <DetailRow label="Tracking Stage" value={userData?.broadHealthStage ? (userData.broadHealthStage.charAt(0).toUpperCase() + userData.broadHealthStage.slice(1)) : "General"} />
          <DetailRow label="Current Phase" value={userData?.currentStage || "Foundation"} />
          <DetailRow label="Sleep Pattern" value={userData?.sleepHours ? (userData.sleepHours < 6 ? "Interrupted" : "Restful") : "Normal"} />
          <DetailRow label="Diet Preference" value={userData?.dietType ? (userData.dietType.charAt(0).toUpperCase() + userData.dietType.slice(1)) : "Balanced"} />
          <DetailRow label="Medical Alert" value={userData?.diabetesHistory !== 'no' ? "History Noted" : "None"} color={userData?.diabetesHistory !== 'no' ? "text-rose-500" : "text-[#1F2937]"} />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white p-8 rounded-[40px] border border-[#F3F4F6] shadow-sm hover:shadow-md transition-shadow">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-h3 font-bold">FAQ</h3>
            <button className="text-primary text-[11px] font-bold uppercase tracking-wider hover:opacity-80">View All</button>
         </div>
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-[#F8F9FA] border border-[#F1F3F5] hover:bg-white transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-[14px] font-bold text-[#1F2937] leading-snug">How does the app predict Diabetes and Obesity risk?</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-2 leading-relaxed">Our ML Backend continuously processes your vitals and history against 4,500+ records in the Gestational Diabetes, Obesity Prediction, and Diabetes Prediction datasets to compute accurate risk probability percentages in real-time!</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-[#F1F3F5] flex items-center justify-between hover:bg-rose-50/30 transition-colors cursor-pointer group">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-[13px] font-bold group-hover:text-primary transition-colors">What are the dietary signs of Type-2 Diabetes?</span>
               </div>
               <ChevronRight className="w-4 h-4 text-[#CED4DA] group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <div className="p-4 rounded-2xl border border-[#F1F3F5] flex items-center justify-between hover:bg-rose-50/30 transition-colors cursor-pointer group">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span className="text-[13px] font-bold group-hover:text-primary transition-colors">What are common symptoms of Menopause?</span>
               </div>
               <ChevronRight className="w-4 h-4 text-[#CED4DA] group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
         </div>
      </section>

      {/* AI Tip Box */}
      <div className="p-8 rounded-[40px] bg-[#FFE4E8] relative overflow-hidden group cursor-default shadow-sm hover:shadow-md transition-all">
         <div className="relative z-10">
           <div className="flex items-center gap-2 mb-3">
             <Brain className="w-5 h-5 text-primary animate-pulse" />
             <span className="text-[12px] font-bold text-primary uppercase tracking-wider">AI Quick Tip</span>
           </div>
           <p className="text-[15px] font-bold text-[#1F2937] leading-relaxed">
             20 minutes of walking daily can significantly reduce metabolic risk during menopause.
           </p>
         </div>
         <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-200/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
      </div>

      {/* AI Chat Box */}
      <section className="bg-white p-6 rounded-[40px] border border-[#F3F4F6] shadow-sm hover:shadow-md transition-shadow">
         <h3 className="text-[15px] font-bold mb-4">Chat with AI Doctor</h3>
         <div className="relative flex items-center">
            <div className="absolute left-3 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white shadow-sm shadow-primary/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <input 
              type="text" 
              readOnly
              onClick={() => window.location.href = '/chat'}
              placeholder="Click here to open Full-Screen AI Chatbot..." 
              className="w-full bg-[#F3F4F6] rounded-full py-4 pl-14 pr-12 text-[14px] border-none focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer text-muted-foreground"
            />
            <button onClick={() => window.location.href = '/chat'} className="absolute right-3 p-2 bg-white rounded-full shadow-sm text-primary hover:scale-110 active:scale-95 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </button>
         </div>
      </section>
    </div>
  </motion.div>
);

const PlaceholderView = ({ title, icon }: any) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex-1 flex flex-col items-center justify-center p-8 text-center"
  >
    <div className="mb-6 p-8 bg-white rounded-[40px] border border-[#F3F4F6] shadow-sm">
      {icon}
    </div>
    <h2 className="text-2xl font-bold text-[#1F2937] mb-2">{title}</h2>
    <p className="text-muted-foreground max-w-md">
      This section is under development. We're working hard to bring you the best health tracking experience.
    </p>
    <div className="mt-8 flex gap-4">
      <button className="px-8 py-3 bg-primary text-white rounded-full font-bold hover:shadow-lg transition-all active:scale-95">
        Notify Me
      </button>
      <button className="px-8 py-3 bg-white border border-[#F3F4F6] text-[#1F2937] rounded-full font-bold hover:bg-gray-50 transition-all">
        Go Back
      </button>
    </div>
  </motion.div>
);

const SidebarIcon = ({ icon, active, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`p-3 lg:p-4 rounded-2xl cursor-pointer transition-all duration-300 ${active ? 'bg-rose-50 shadow-sm border border-rose-100' : 'hover:bg-gray-50'}`}
  >
    {icon}
  </div>
);

const MiniStatCard = ({ icon, label, value, trend, color, trendColor }: any) => (
  <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/30 rounded-full -mr-12 -mt-12 transition-all duration-500 group-hover:scale-150"></div>
    <div className="flex justify-between items-start mb-6 relative">
      <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center shadow-sm`}>
        {icon}
      </div>
      <p className={`text-[12px] font-bold ${trendColor}`}>{trend}</p>
    </div>
    <div className="relative">
      <p className="text-caption text-muted-foreground font-bold mb-1">{label}</p>
      <p className="text-[24px] font-bold text-[#1F2937]">{value}</p>
    </div>
  </motion.div>
);

const DetailRow = ({ label, value, color }: any) => (
  <div className="flex justify-between items-center text-[13px]">
    <span className="text-muted-foreground font-bold">{label}</span>
    <span className={`font-bold ${color || 'text-[#1F2937]'}`}>{value}</span>
  </div>
);

// ── NEW FUNCTIONAL VIEWS ──

const ViewHeader = ({ title, icon, setActiveTab }: any) => (
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-3xl font-bold flex items-center gap-3">
      {icon} {title}
    </h2>
    <button 
      onClick={() => setActiveTab("home")}
      className="px-6 py-2.5 bg-white border border-[#F3F4F6] rounded-full text-[14px] font-bold shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600"
    >
      ← Go Back
    </button>
  </div>
);

const ActivityTrackerView = ({ setActiveTab }: any) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-5xl mx-auto w-full space-y-6">
    <ViewHeader title="Activity Tracking" icon={<Activity className="text-blue-500" />} setActiveTab={setActiveTab} />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <div className="bg-white p-8 rounded-[32px] shadow-sm border border-[#F3F4F6]">
         <h3 className="font-bold text-muted-foreground">Daily Steps</h3>
         <p className="text-[48px] font-bold mt-2 text-[#1F2937]">8,432</p>
         <p className="text-emerald-500 text-[14px] font-bold mt-1">+1,200 from yesterday 🏃‍♀️</p>
         <div className="w-full bg-gray-100 h-3 rounded-full mt-6">
           <div className="bg-blue-500 h-3 rounded-full" style={{ width: '84%' }}></div>
         </div>
       </div>
       <div className="bg-white p-8 rounded-[32px] shadow-sm border border-[#F3F4F6]">
         <h3 className="font-bold text-muted-foreground">Active Minutes (Zone 2)</h3>
         <p className="text-[48px] font-bold mt-2 text-[#1F2937]">45 min</p>
         <p className="text-emerald-500 text-[14px] font-bold mt-1">Goal Reached! 🎯</p>
         <div className="w-full bg-gray-100 h-3 rounded-full mt-6">
           <div className="bg-green-500 h-3 rounded-full" style={{ width: '100%' }}></div>
         </div>
       </div>
    </div>
  </motion.div>
);

const HealthMetricsView = ({ setActiveTab }: any) => {
    const [bp, setBp] = useState("");
    const [hr, setHr] = useState("");
    const [vitals, setVitals] = useState([
      { date: 'Today, 8:00 AM', bp: '118/78', hr: '72 bpm' },
      { date: 'Yesterday', bp: '120/80', hr: '75 bpm' }
    ]);

    const handleSave = () => {
      if(!bp || !hr) return;
      setVitals([{ date: 'Just Now', bp, hr: hr + ' bpm' }, ...vitals]);
      setBp(""); setHr("");
      toast.success("Vitals logged successfully!");
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-5xl mx-auto w-full space-y-6">
        <ViewHeader title="Health Metrics & Vital Log" icon={<Heart className="text-rose-500" />} setActiveTab={setActiveTab} />
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-[#F3F4F6] mb-6">
          <h3 className="text-xl font-bold mb-4">Log New Vital Sign</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <input value={bp} onChange={e=>setBp(e.target.value)} type="text" placeholder="Blood Pressure (e.g. 120/80)" className="bg-[#F3F4F6] border-none p-4 rounded-2xl flex-1 outline-none focus:ring-2 focus:ring-primary/20" />
            <input value={hr} onChange={e=>setHr(e.target.value)} type="text" placeholder="Heart Rate (bpm)" className="bg-[#F3F4F6] border-none p-4 rounded-2xl flex-1 outline-none focus:ring-2 focus:ring-primary/20" />
            <button onClick={handleSave} className="bg-primary text-white font-bold px-8 py-4 rounded-2xl hover:bg-rose-500 transition-colors">Save Log</button>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-[#F3F4F6]">
          <h3 className="text-xl font-bold mb-6">Recent Vitals History</h3>
          <div className="space-y-4">
            {vitals.map((v, i) => (
              <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-4">
                <span className="font-bold text-gray-500">{v.date}</span>
                <span className="font-medium">BP: <strong className="text-primary ml-1">{v.bp}</strong> mm Hg</span>
                <span className="font-medium">Heart Rate: <strong className="text-primary ml-1">{v.hr}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
};

const AnalyticsTrendsView = ({ setActiveTab }: any) => (
   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-5xl mx-auto w-full space-y-6">
    <ViewHeader title="Analytics & Trends" icon={<BarChart2 className="text-amber-500" />} setActiveTab={setActiveTab} />
    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-[#F3F4F6]">
      <div className="flex justify-between mb-8">
        <h3 className="text-xl font-bold">Metabolic Health Trend Analysis</h3>
        <select className="bg-gray-50 border-none rounded-xl px-4 py-2 font-bold outline-none"><option>Last 6 Months</option></select>
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[{name: 'Oct', bmi: 24.5, hr: 78}, {name: 'Nov', bmi: 24.2, hr: 76}, {name: 'Dec', bmi: 24.0, hr: 75}, {name: 'Jan', bmi: 23.8, hr: 74}, {name: 'Feb', bmi: 23.6, hr: 72}, {name: 'Mar', bmi: 23.4, hr: 70}]}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontWeight: 'bold'}} dy={10} />
            <YAxis yAxisId="left" hide domain={['auto', 'auto']} />
            <YAxis yAxisId="right" orientation="right" hide domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Line yAxisId="left" type="monotone" name="Resting HR" dataKey="hr" stroke="#FF758C" strokeWidth={4} dot={{r: 6, strokeWidth: 3}} activeDot={{r: 8}} />
            <Line yAxisId="right" type="monotone" name="BMI Index" dataKey="bmi" stroke="#3B82F6" strokeWidth={4} dot={{r: 6, strokeWidth: 3}} activeDot={{r: 8}} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-6 flex justify-center gap-8">
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div><span className="font-bold text-gray-600">Resting Heart Rate (Improvements)</span></div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="font-bold text-gray-600">BMI Index Decreasing</span></div>
      </div>
    </div>
  </motion.div>
);

const HistoryScheduleView = ({ setActiveTab }: any) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-5xl mx-auto w-full space-y-6">
    <ViewHeader title="History & Schedule" icon={<Clock className="text-purple-500" />} setActiveTab={setActiveTab} />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <div className="bg-white p-8 rounded-[32px] shadow-sm border border-[#F3F4F6]">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Upcoming Appointments</h3>
            <button className="text-primary font-bold bg-rose-50 px-4 py-2 rounded-xl text-sm">Add New +</button>
         </div>
         <div className="space-y-4">
           <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-4 hover:shadow-md transition">
             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-purple-500 font-bold shadow-sm">
               <Calendar size={20} />
             </div>
             <div>
               <p className="font-bold text-[16px] text-purple-900">Annual Metabolic Checkup</p>
               <p className="text-[13px] text-purple-600 font-medium mt-1">Tomorrow, 10:00 AM — Dr. Sarah Smith</p>
             </div>
           </div>
         </div>
       </div>
       <div className="bg-white p-8 rounded-[32px] shadow-sm border border-[#F3F4F6]">
         <h3 className="text-xl font-bold mb-6">Medical History</h3>
         <div className="pl-4 border-l-2 border-gray-100 space-y-6">
           <div className="relative">
             <div className="absolute -left-[21px] w-3 h-3 bg-primary rounded-full ring-4 ring-white"></div>
             <p className="font-bold text-gray-800">Complete Blood Count (CBC) Test</p>
             <p className="text-sm text-gray-400 font-medium tracking-wide">March 10, 2026</p>
           </div>
           <div className="relative">
             <div className="absolute -left-[21px] w-3 h-3 bg-blue-400 rounded-full ring-4 ring-white"></div>
             <p className="font-bold text-gray-800">Dietary & Nutrition Consultation</p>
             <p className="text-sm text-gray-400 font-medium tracking-wide">February 22, 2026</p>
           </div>
         </div>
       </div>
    </div>
  </motion.div>
);

const ExpertConsultationsView = ({ setActiveTab }: any) => {
  const handleBooking = (name: string) => {
    toast.success(`Booking request sent to ${name}! They will confirm your appointment shortly.`);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-5xl mx-auto w-full space-y-6">
      <ViewHeader title="Expert Consultancy" icon={<MessageCircle className="text-indigo-500" />} setActiveTab={setActiveTab} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[#F3F4F6] flex flex-col md:flex-row items-center gap-6 hover:shadow-lg transition">
            <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-blue-50 flex items-center justify-center font-bold text-blue-500 text-3xl shrink-0">
              <img src="https://ui-avatars.com/api/?name=Alice+Morgan&background=E0F2FE&color=3B82F6&size=150" alt="Dr" className="rounded-full w-full h-full" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="font-bold text-[18px]">Dr. Alice Morgan</h3>
              <p className="text-gray-500 text-[13px] font-medium leading-relaxed mt-1 mb-4">Obstetrician-Gynecologist & Menopause Specialist. 15+ years experience.</p>
              <button onClick={()=>handleBooking("Dr. Alice Morgan")} className="bg-blue-500 text-white text-[13px] px-6 py-2.5 rounded-full font-bold hover:bg-blue-600 transition">Book Virtual Consult</button>
            </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[#F3F4F6] flex flex-col md:flex-row items-center gap-6 hover:shadow-lg transition">
            <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-50 flex items-center justify-center font-bold text-emerald-500 text-3xl shrink-0">
               <img src="https://ui-avatars.com/api/?name=Charles+Weber&background=D1FAE5&color=10B981&size=150" alt="Dr" className="rounded-full w-full h-full" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="font-bold text-[18px]">Dr. Charles Weber</h3>
              <p className="text-gray-500 text-[13px] font-medium leading-relaxed mt-1 mb-4">Clinical Dietitian & Metabolic Health Specialist. PhD in Nutrition.</p>
              <button onClick={()=>handleBooking("Dr. Charles Weber")} className="bg-emerald-500 text-white text-[13px] px-6 py-2.5 rounded-full font-bold hover:bg-emerald-600 transition">Book Virtual Consult</button>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
