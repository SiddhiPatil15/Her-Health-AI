import { useState, useEffect } from "react";
import { auth, db, doc, setDoc } from "@/lib/firebase";
import { saveWearableLog, getWearableLogs, WearableLog } from "@/lib/healthService";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Heart, 
  Activity, 
  Moon, 
  RefreshCw, 
  Smartphone, 
  CheckCircle, 
  Info,
  TrendingUp,
  MapPin,
  Flame
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

export default function GoogleFitSyncView({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [syncing, setSyncing] = useState(false);
  const [syncedLogs, setSyncedLogs] = useState<WearableLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const logs = await getWearableLogs(user.uid, 7);
      // Sort ascending for charts
      setSyncedLogs([...logs].reverse());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSyncing(true);
    toast.info("Connecting to Google Fit Cloud API...", { duration: 2000 });

    setTimeout(async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        
        // Mock wearable values
        const mockSteps = Math.floor(6000 + Math.random() * 6000);
        const mockDistance = Number((mockSteps * 0.00075).toFixed(2));
        const mockCalories = Math.floor(mockSteps * 0.04 + 1800);
        const mockHeartRate = Math.floor(65 + Math.random() * 15);
        const mockSleep = Math.floor(360 + Math.random() * 180); // minutes

        const newLog: Omit<WearableLog, "lastSyncedAt"> = {
          date: todayStr,
          steps: mockSteps,
          distanceKm: mockDistance,
          caloriesBurned: mockCalories,
          restingHeartRate: mockHeartRate,
          sleepDurationMinutes: mockSleep
        };

        await saveWearableLog(user.uid, newLog);
        await setDoc(doc(db, "users", user.uid), { latestWearables: newLog }, { merge: true });
        toast.success("Wearable stats synchronized with HerHealth AI!");
        fetchLogs();
      } catch (err) {
        console.error(err);
        toast.error("Google Fit synchronization failed.");
      } finally {
        setSyncing(false);
      }
    }, 2500);
  };

  const latestStats = syncedLogs[syncedLogs.length - 1];

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Smartphone size={32} className="text-blue-500 animate-bounce" /> Google Fit Wearable Sync
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Connect smart watches and bands to automatically synchronize vitals, sleep, and steps.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-full text-[14px] font-bold shadow-md transition-all flex items-center gap-2"
          >
            <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Synchronizing Fit..." : "Sync Wearable Data"}
          </button>
          <button 
            onClick={() => setActiveTab("home")}
            className="px-6 py-2.5 bg-white border border-[#F3F4F6] rounded-full text-[14px] font-bold shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 shrink-0"
          >
            ← Go Back
          </button>
        </div>
      </div>

      {/* Info notice about score calculation */}
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 flex gap-3 text-blue-900">
        <Info className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">Health Score Integration Enabled</p>
          <p className="text-xs mt-1 leading-relaxed text-blue-700 font-semibold">
            Google Fit steps and sleep logs are dynamically incorporated into your **Unified Health Score**. Achieving 8,000 steps and 8 hours of restorative sleep directly boosts your index.
          </p>
        </div>
      </div>

      {/* Stats Summary cards */}
      {latestStats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Steps */}
          <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-sm">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Steps Today</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{latestStats.steps.toLocaleString()}</p>
            </div>
          </div>

          {/* Distance */}
          <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Distance Walked</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{latestStats.distanceKm} km</p>
            </div>
          </div>

          {/* Heart Rate */}
          <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 shadow-sm">
              <Heart size={24} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Resting Heart Rate</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{latestStats.restingHeartRate} bpm</p>
            </div>
          </div>

          {/* Sleep */}
          <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 shadow-sm">
              <Moon size={24} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sleep Duration</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{(latestStats.sleepDurationMinutes / 60).toFixed(1)} hrs</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-[32px] border border-[#F3F4F6] text-center text-muted-foreground font-bold">
          No wearable sync data found. Click "Sync Wearable Data" above to fetch today's stats.
        </div>
      )}

      {/* Visual Analytics */}
      {syncedLogs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Activity size={18} className="text-blue-500" /> Daily Steps Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={syncedLogs}>
                  <defs>
                    <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={10} fontWeight="bold" tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" name="Steps" dataKey="steps" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSteps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Moon size={18} className="text-purple-500" /> Sleep Duration (Hours)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={syncedLogs.map(l => ({ ...l, sleepHrs: Number((l.sleepDurationMinutes / 60).toFixed(1)) }))}>
                  <defs>
                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={10} fontWeight="bold" tickLine={false} domain={[0, 10]} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" name="Hours" dataKey="sleepHrs" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorSleep)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
