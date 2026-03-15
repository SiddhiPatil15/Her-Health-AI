import { useState } from "react";
import { motion } from "framer-motion";
import { Weight, Footprints, Moon, Droplets, Activity, Plus, Loader2 } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ChartCard from "@/components/dashboard/ChartCard";
import { auth } from "@/lib/firebase";
import { saveHealthLog, getHealthLogs, DailyHealthLog } from "@/lib/healthService";
import { toast } from "sonner";

const trackerMetrics = [
  { icon: Weight, label: "Weight", value: "68.2", unit: "kg", color: "#E56B8A" },
  { icon: Footprints, label: "Steps", value: "6,842", unit: "steps", color: "#6F7BF7" },
  { icon: Moon, label: "Sleep", value: "7.2", unit: "hrs", color: "#4CAF8D" },
  { icon: Droplets, label: "Water", value: "2.1", unit: "L", color: "#F2A65A" },
  { icon: Activity, label: "Activity", value: "45", unit: "min", color: "#E56B8A" },
];

const weeklyWeight = [
  { name: "Mon", value: 68.5 }, { name: "Tue", value: 68.3 }, { name: "Wed", value: 68.2 },
  { name: "Thu", value: 68.4 }, { name: "Fri", value: 68.1 }, { name: "Sat", value: 68.0 }, { name: "Sun", value: 68.2 },
];

const weeklySteps = [
  { name: "Mon", value: 5200 }, { name: "Tue", value: 7100 }, { name: "Wed", value: 6800 },
  { name: "Thu", value: 8200 }, { name: "Fri", value: 6500 }, { name: "Sat", value: 9100 }, { name: "Sun", value: 6842 },
];

const weeklySleep = [
  { name: "Mon", value: 6.5 }, { name: "Tue", value: 7.0 }, { name: "Wed", value: 7.5 },
  { name: "Thu", value: 6.8 }, { name: "Fri", value: 7.2 }, { name: "Sat", value: 8.0 }, { name: "Sun", value: 7.2 },
];

const HealthTracker = () => {
  const [activeMetric, setActiveMetric] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    weightKg: "",
    steps: "",
    sleepHours: "",
    waterLiters: "",
    activityMinutes: "",
  });

  const handleLogToday = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Please log in first");
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await saveHealthLog(user.uid, {
        date: today,
        weightKg: logForm.weightKg ? Number(logForm.weightKg) : undefined,
        steps: logForm.steps ? Number(logForm.steps) : undefined,
        sleepHours: logForm.sleepHours ? Number(logForm.sleepHours) : undefined,
        waterLiters: logForm.waterLiters ? Number(logForm.waterLiters) : undefined,
        activityMinutes: logForm.activityMinutes ? Number(logForm.activityMinutes) : undefined,
      });
      toast.success("Today's health log saved!");
      setShowLogModal(false);
      setLogForm({ weightKg: "", steps: "", sleepHours: "", waterLiters: "", activityMinutes: "" });
    } catch (err: unknown) {
      toast.error("Failed to save log — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const chartDataMap = [weeklyWeight, weeklySteps, weeklySleep, weeklySteps, weeklyWeight];

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-8 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-h1 text-foreground">Health Tracker</h1>
              <p className="text-body text-muted-foreground">Log and track your daily health metrics</p>
            </div>
            <button
              onClick={() => setShowLogModal(true)}
              className="px-5 py-2.5 gradient-primary text-primary-foreground rounded-xl text-body font-medium hover-lift flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Log Today
            </button>
          </div>

          {/* Log Today Modal */}
          {showLogModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={(e) => { if (e.target === e.currentTarget) setShowLogModal(false); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card rounded-3xl p-8 border border-border shadow-2xl w-full max-w-md"
              >
                <h3 className="text-h2 font-bold mb-6">Log Today's Metrics</h3>
                <div className="space-y-4">
                  {[
                    { label: "Weight (kg)", key: "weightKg", placeholder: "68.5", type: "number" },
                    { label: "Steps", key: "steps", placeholder: "7500", type: "number" },
                    { label: "Sleep (hours)", key: "sleepHours", placeholder: "7.5", type: "number" },
                    { label: "Water (litres)", key: "waterLiters", placeholder: "2.0", type: "number" },
                    { label: "Activity (minutes)", key: "activityMinutes", placeholder: "45", type: "number" },
                  ].map(({ label, key, placeholder, type }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-caption font-medium text-muted-foreground">{label}</label>
                      <input
                        type={type}
                        value={logForm[key as keyof typeof logForm]}
                        onChange={(e) => setLogForm(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full p-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowLogModal(false)}
                    className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogToday}
                    disabled={saving}
                    className="flex-1 py-3 gradient-primary text-primary-foreground rounded-xl font-medium hover-lift disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Saving…" : "Save Log"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-5 gap-4">
            {trackerMetrics.map(({ icon: Icon, label, value, unit, color }, i) => (
              <motion.button
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveMetric(i)}
                className={`bg-card rounded-2xl p-5 card-shadow border text-left hover-lift transition-all ${
                  activeMetric === i ? "border-primary" : "border-border"
                }`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: color + '20' }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <p className="text-caption text-muted-foreground">{label}</p>
                <p className="text-h2 text-foreground">{value} <span className="text-caption text-muted-foreground font-normal">{unit}</span></p>
              </motion.button>
            ))}
          </div>

          {/* Chart */}
          <ChartCard
            title={`${trackerMetrics[activeMetric].label} — This Week`}
            data={chartDataMap[activeMetric]}
            color={trackerMetrics[activeMetric].color}
            gradientId={`tracker-${activeMetric}`}
          />

          {/* Log History */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 card-shadow border border-border"
          >
            <h3 className="text-h3 text-foreground mb-4">Recent Logs</h3>
            <div className="space-y-3">
              {["Today", "Yesterday", "2 days ago"].map((day, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <span className="text-body text-foreground font-medium">{day}</span>
                  <div className="flex gap-6">
                    <span className="text-caption text-muted-foreground">68.{2 + i} kg</span>
                    <span className="text-caption text-muted-foreground">{6842 - i * 500} steps</span>
                    <span className="text-caption text-muted-foreground">{7.2 - i * 0.3} hrs sleep</span>
                    <span className="text-caption text-muted-foreground">{2.1 - i * 0.2}L water</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default HealthTracker;
