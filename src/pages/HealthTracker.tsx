import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Weight, Footprints, Moon, Droplets, Activity, Plus, Loader2, Play, Square } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ChartCard from "@/components/dashboard/ChartCard";
import { auth } from "@/lib/firebase";
import { saveHealthLog, getHealthLogs, DailyHealthLog } from "@/lib/healthService";
import { toast } from "sonner";

const HealthTracker = () => {
  const [activeMetric, setActiveMetric] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [recentLogs, setRecentLogs] = useState<DailyHealthLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logForm, setLogForm] = useState({
    weightKg: "",
    steps: "",
    sleepHours: "",
    waterLiters: "",
    activityMinutes: "",
  });

  // ── Pedometer state ────────────────────────────────────────────────────────
  const [pedoActive, setPedoActive] = useState(false);
  const [pedoSteps, setPedoSteps] = useState(0);
  const pedoRef = useRef({ lastAcc: 0, stepCount: 0, lastStep: 0 });

  // ── Load real logs from Firebase ───────────────────────────────────────────
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getHealthLogs(user.uid, 10).then((logs) => {
      setRecentLogs(logs);
      // Pre-fill chart data from logs
    }).finally(() => setLoadingLogs(false));
  }, []);

  // ── Device Motion Pedometer ────────────────────────────────────────────────
  const startPedometer = () => {
    if (typeof DeviceMotionEvent === "undefined") {
      toast.error("Your device/browser does not support motion tracking. Please enter steps manually.");
      return;
    }
    // iOS 13+ requires permission
    if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
      (DeviceMotionEvent as any).requestPermission().then((state: string) => {
        if (state === "granted") listenMotion();
        else toast.error("Motion permission denied. Please enter steps manually.");
      });
    } else {
      listenMotion();
    }
  };

  const listenMotion = () => {
    pedoRef.current = { lastAcc: 0, stepCount: 0, lastStep: 0 };
    setPedoSteps(0);
    setPedoActive(true);
    toast.success("Pedometer started! Walk around to count steps.");

    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const magnitude = Math.sqrt(
        (acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2
      );
      const delta = Math.abs(magnitude - pedoRef.current.lastAcc);
      pedoRef.current.lastAcc = magnitude;
      const now = Date.now();
      // Step detected: spike above threshold, min 300ms between steps
      if (delta > 3.5 && now - pedoRef.current.lastStep > 300) {
        pedoRef.current.stepCount += 1;
        pedoRef.current.lastStep = now;
        setPedoSteps(pedoRef.current.stepCount);
      }
    };
    window.addEventListener("devicemotion", handler);
    (window as any).__pedoHandler = handler;
  };

  const stopPedometer = () => {
    setPedoActive(false);
    if ((window as any).__pedoHandler) {
      window.removeEventListener("devicemotion", (window as any).__pedoHandler);
      delete (window as any).__pedoHandler;
    }
    const steps = pedoRef.current.stepCount;
    if (steps > 0) {
      setLogForm((prev) => ({ ...prev, steps: String(steps) }));
      toast.success(`${steps} steps recorded! Open "Log Today" to save to your profile.`);
      setShowLogModal(true);
    } else {
      toast.info("No steps detected. Try walking with your phone in hand.");
    }
  };

  const handleLogToday = async () => {
    const user = auth.currentUser;
    if (!user) { toast.error("Please log in first"); return; }
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
      toast.success("Today's health log saved to Firebase!");
      setShowLogModal(false);
      setLogForm({ weightKg: "", steps: "", sleepHours: "", waterLiters: "", activityMinutes: "" });
      // Reload logs
      const logs = await getHealthLogs(user.uid, 10);
      setRecentLogs(logs);
    } catch {
      toast.error("Failed to save log — please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Build chart data from real logs (fallback to empty)
  const buildChart = (key: keyof DailyHealthLog) =>
    recentLogs.slice(0, 7).reverse().map((l, i) => ({
      name: l.date ? l.date.slice(5) : `Day ${i + 1}`,
      value: typeof l[key] === "number" ? (l[key] as number) : 0,
    }));

  const trackerMetrics = [
    { icon: Weight, label: "Weight", unit: "kg", color: "#E56B8A", key: "weightKg" as keyof DailyHealthLog },
    { icon: Footprints, label: "Steps", unit: "steps", color: "#6F7BF7", key: "steps" as keyof DailyHealthLog },
    { icon: Moon, label: "Sleep", unit: "hrs", color: "#4CAF8D", key: "sleepHours" as keyof DailyHealthLog },
    { icon: Droplets, label: "Water", unit: "L", color: "#F2A65A", key: "waterLiters" as keyof DailyHealthLog },
    { icon: Activity, label: "Activity", unit: "min", color: "#E56B8A", key: "activityMinutes" as keyof DailyHealthLog },
  ];

  // Latest metric values from most recent log
  const latestLog = recentLogs[0];
  const getLatestValue = (key: keyof DailyHealthLog): string => {
    if (!latestLog) return "—";
    const v = latestLog[key];
    return v != null ? String(v) : "—";
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-8 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-h1 text-foreground">Health Tracker</h1>
              <p className="text-body text-muted-foreground">Log and track your daily health metrics</p>
            </div>
            <div className="flex gap-3">
              {/* Pedometer */}
              <button
                onClick={pedoActive ? stopPedometer : startPedometer}
                className={`px-5 py-2.5 rounded-xl text-body font-medium hover-lift flex items-center gap-2 transition-all ${
                  pedoActive
                    ? "bg-rose-100 text-rose-600 border border-rose-200"
                    : "bg-blue-50 text-blue-600 border border-blue-200"
                }`}
              >
                {pedoActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {pedoActive ? `Stop Pedometer (${pedoSteps} steps)` : "Start Pedometer"}
              </button>
              <button
                onClick={() => setShowLogModal(true)}
                className="px-5 py-2.5 gradient-primary text-primary-foreground rounded-xl text-body font-medium hover-lift flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Log Today
              </button>
            </div>
          </div>

          {/* Pedometer live banner */}
          {pedoActive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Footprints className="w-5 h-5 text-blue-500 animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-blue-800">Pedometer Active 🚶</p>
                <p className="text-sm text-blue-600">Keep your phone in your hand or pocket while walking.</p>
              </div>
              <div className="ml-auto text-center">
                <p className="text-3xl font-bold text-blue-700">{pedoSteps.toLocaleString()}</p>
                <p className="text-xs text-blue-500 font-medium">steps counted</p>
              </div>
            </motion.div>
          )}

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
                <h3 className="text-h2 font-bold mb-2">Log Today's Metrics</h3>
                <p className="text-sm text-muted-foreground mb-6">Data is saved directly to your Firebase profile.</p>
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
                    {saving ? "Saving…" : "Save to Firebase"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Metric Cards — show real latest values */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {trackerMetrics.map(({ icon: Icon, label, unit, color, key }, i) => (
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: color + "20" }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <p className="text-caption text-muted-foreground">{label}</p>
                <p className="text-h2 text-foreground">
                  {getLatestValue(key)} <span className="text-caption text-muted-foreground font-normal">{unit}</span>
                </p>
              </motion.button>
            ))}
          </div>

          {/* Chart with real data */}
          <ChartCard
            title={`${trackerMetrics[activeMetric].label} — Last 7 Logs`}
            data={buildChart(trackerMetrics[activeMetric].key)}
            color={trackerMetrics[activeMetric].color}
            gradientId={`tracker-${activeMetric}`}
          />

          {/* Real Recent Logs from Firebase */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 card-shadow border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 text-foreground">Recent Logs (from Firebase)</h3>
              {loadingLogs && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            {recentLogs.length === 0 && !loadingLogs ? (
              <div className="text-center py-8 text-muted-foreground">
                <Footprints className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No logs yet. Tap "Log Today" to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.slice(0, 7).map((log, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <span className="text-body text-foreground font-medium">{log.date}</span>
                    <div className="flex gap-4 flex-wrap justify-end">
                      {log.weightKg != null && <span className="text-caption text-muted-foreground">{log.weightKg} kg</span>}
                      {log.steps != null && <span className="text-caption text-blue-600 font-semibold">{log.steps.toLocaleString()} steps</span>}
                      {log.sleepHours != null && <span className="text-caption text-muted-foreground">{log.sleepHours} hrs sleep</span>}
                      {log.waterLiters != null && <span className="text-caption text-muted-foreground">{log.waterLiters}L water</span>}
                      {log.activityMinutes != null && <span className="text-caption text-muted-foreground">{log.activityMinutes} min activity</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default HealthTracker;
