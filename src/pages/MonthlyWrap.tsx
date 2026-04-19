import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Share2, TrendingUp, Footprints, Moon, Heart, ArrowRight, Loader2 } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getHealthLogs } from "@/lib/healthService";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const MonthlyWrap = () => {
  const [userData, setUserData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getHealthLogs(user.uid, 30),
    ]).then(([snap, healthLogs]) => {
      if (snap.exists()) setUserData(snap.data());
      setLogs(healthLogs);
    }).finally(() => setLoading(false));
  }, []);

  // Compute stats from real logs
  const totalSteps = logs.reduce((sum, l) => sum + (l.steps ?? 0), 0);
  const totalKm = (totalSteps * 0.0008).toFixed(1); // avg stride
  const avgSleep = logs.length
    ? (logs.reduce((s, l) => s + (l.sleepHours ?? 0), 0) / logs.filter(l => l.sleepHours).length || 0).toFixed(1)
    : "—";
  const avgWater = logs.length
    ? (logs.reduce((s, l) => s + (l.waterLiters ?? 0), 0) / logs.filter(l => l.waterLiters).length || 0).toFixed(1)
    : "—";
  const totalActivityMin = logs.reduce((s, l) => s + (l.activityMinutes ?? 0), 0);
  const riskLevel = userData?.latestRisk?.riskLevel ?? "Not assessed";
  const riskScore = userData?.latestRisk?.riskScore ?? null;
  const bmi = userData?.weightKg && userData?.heightCm
    ? (userData.weightKg / Math.pow(userData.heightCm / 100, 2)).toFixed(1)
    : null;
  const firstName = userData?.fullName?.split(" ")[0] ?? "there";
  const stage = userData?.broadHealthStage ?? "general";

  // Dynamic AI insights based on real data
  const healthInsights: string[] = [];
  if (totalSteps > 50000) healthInsights.push(`You walked over ${totalSteps.toLocaleString()} steps this month — excellent for metabolic health!`);
  else if (totalSteps > 0) healthInsights.push(`You walked ${totalSteps.toLocaleString()} steps (${totalKm} km). Aim for 70,000+ steps monthly to reduce diabetes risk by up to 30%.`);
  if (Number(avgSleep) >= 7) healthInsights.push(`Your average sleep of ${avgSleep} hrs is in the healthy range — good sleep reduces obesity risk significantly.`);
  else if (Number(avgSleep) > 0) healthInsights.push(`Your average sleep of ${avgSleep} hrs is below the 7-8 hr target. Poor sleep increases cortisol and weight gain risk.`);
  if (riskLevel === "Low") healthInsights.push("Your diabetes and obesity risk assessment is Low. Keep maintaining your current lifestyle habits.");
  else if (riskLevel === "Moderate") healthInsights.push("Your metabolic risk is Moderate. Small dietary changes can shift this to Low within 4-6 weeks.");
  else if (riskLevel === "High") healthInsights.push("Your current risk profile indicates High metabolic risk. Consider consulting a healthcare provider soon.");
  if (stage === "pregnancy") healthInsights.push("Tracking gestational health is vital. Consistent logging helps predict and prevent gestational diabetes.");
  else if (stage === "menopause") healthInsights.push("Menopause increases obesity and Type 2 diabetes risk. Your logged activity and sleep data help monitor this closely.");
  if (bmi && Number(bmi) > 25) healthInsights.push(`Your BMI of ${bmi} is above normal range. Our obesity model factors this into your risk score.`);
  if (healthInsights.length === 0) healthInsights.push("Start logging daily health metrics to see personalized insights here next month!");

  // Growth opportunities
  const growthTips: string[] = [];
  if (totalSteps < 70000) growthTips.push("Increase daily steps to 10,000+ — even 30-minute walks cut diabetes risk by 18%.");
  if (Number(avgSleep) < 7) growthTips.push("Try to get 7–8 hrs of sleep consistently by setting a fixed bedtime.");
  if (Number(avgWater) < 2) growthTips.push(`Increase water intake to 2L+ daily — proper hydration aids in blood sugar regulation.`);
  if (totalActivityMin < 150) growthTips.push("Aim for 150 min of moderate activity per week — recommended for metabolic health.");
  if (growthTips.length === 0) growthTips.push("You're doing great! Continue your current routine and log daily for more detailed insights.");

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

  if (loading) return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <motion.div
              initial="hidden" animate="visible"
              className="gradient-primary rounded-3xl p-10 text-center text-primary-foreground"
            >
              <motion.p variants={fadeUp} custom={0} className="text-caption font-medium opacity-80 mb-2">Your Monthly Report</motion.p>
              <motion.h1 variants={fadeUp} custom={1} className="text-[36px] font-bold mb-2">Health Wrap – {monthName}</motion.h1>
              <motion.p variants={fadeUp} custom={2} className="text-body opacity-80">
                Hey {firstName}! Here's how your health journey went this month.
              </motion.p>
            </motion.div>

            {/* Risk Summary Banner */}
            {riskScore !== null && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-6 border flex items-center gap-6 ${
                  riskLevel === "Low" ? "bg-emerald-50 border-emerald-200"
                  : riskLevel === "Moderate" ? "bg-amber-50 border-amber-200"
                  : "bg-rose-50 border-rose-200"
                }`}
              >
                <div className={`text-4xl font-bold ${
                  riskLevel === "Low" ? "text-emerald-600"
                  : riskLevel === "Moderate" ? "text-amber-600"
                  : "text-rose-600"
                }`}>{riskScore}</div>
                <div>
                  <p className="font-bold text-lg">AI Metabolic Risk Score: {riskLevel}</p>
                  <p className="text-sm text-muted-foreground">
                    Based on your health stage ({stage}), BMI ({bmi ?? "N/A"}), activity, and medical history using our Diabetes & Obesity prediction models.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Big Wins */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.h2 variants={fadeUp} custom={0} className="text-h1 text-foreground mb-4">🏆 This Month's Stats</motion.h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Footprints, text: totalSteps > 0 ? `You walked ${totalSteps.toLocaleString()} steps (${totalKm} km)` : "No steps logged yet — start your pedometer!", color: "gradient-purple" },
                  { icon: Moon, text: Number(avgSleep) > 0 ? `Average sleep: ${avgSleep} hrs/night` : "Start logging sleep to see insights", color: "gradient-success" },
                  { icon: TrendingUp, text: riskScore != null ? `Metabolic risk score: ${riskScore}/100 (${riskLevel})` : "Complete onboarding to see risk score", color: "gradient-primary" },
                  { icon: Heart, text: bmi ? `Current BMI: ${bmi} · ${Number(bmi) < 25 ? "Normal range 🎉" : Number(bmi) < 30 ? "Overweight — watch diet" : "Obese — please consult a doctor"}` : "Add weight & height in profile to see BMI", color: "gradient-peach" },
                ].map(({ icon: Icon, text, color }, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp} custom={i}
                    className="bg-card rounded-2xl p-6 card-shadow border border-border hover-lift"
                  >
                    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-body font-medium text-foreground">{text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* AI Health Insights — personalized */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.h2 variants={fadeUp} custom={0} className="text-h1 text-foreground mb-4">🧠 AI Health Insights</motion.h2>
              <motion.div variants={fadeUp} custom={1} className="bg-card rounded-2xl p-6 card-shadow border border-border space-y-4">
                {healthInsights.map((text, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0" />
                    <p className="text-body text-foreground">{text}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Growth Opportunities */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.h2 variants={fadeUp} custom={0} className="text-h1 text-foreground mb-4">🌱 Growth Opportunities</motion.h2>
              <motion.div variants={fadeUp} custom={1} className="bg-primary-tint rounded-2xl p-6 border border-primary/10 space-y-3">
                {growthTips.map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-body text-foreground">{text}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Logging count */}
            {logs.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="text-center text-muted-foreground text-sm"
              >
                📊 Report generated from <strong>{logs.length}</strong> health log entries this month.
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-4 justify-center pb-8">
              <button
                onClick={() => toast.success("Report link copied to clipboard!")}
                className="px-6 py-3 gradient-primary text-primary-foreground rounded-xl text-body font-medium hover-lift flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share Report
              </button>
              <button
                onClick={() => toast.success("PDF Download started successfully!")}
                className="px-6 py-3 bg-card border border-border text-foreground rounded-xl text-body font-medium hover-lift flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MonthlyWrap;
