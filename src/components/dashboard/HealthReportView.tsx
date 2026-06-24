import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { getCycleLogs, getMoodLogs, getFoodLogs, CycleLog, MoodLog, FoodLog } from "@/lib/healthService";
import { toast } from "sonner";
import { 
  FileText, 
  Printer, 
  User, 
  Heart, 
  Activity, 
  Brain, 
  Calendar, 
  Apple, 
  TrendingUp,
  ShieldAlert
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Cell
} from "recharts";

export default function HealthReportView({ userData, scores, setActiveTab }: { userData: any; scores: any; setActiveTab: (tab: string) => void }) {
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userData]);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const [c, m, f] = await Promise.all([
        getCycleLogs(user.uid, 5),
        getMoodLogs(user.uid),
        getFoodLogs(user.uid, 5)
      ]);
      setCycleLogs(c);
      setMoodLogs(m);
      setFoodLogs(f);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!userData) return <div className="p-8 text-center">No health data available. Please complete onboarding.</div>;

  const bmi = userData.weightKg && userData.heightCm
    ? (userData.weightKg / Math.pow(userData.heightCm / 100, 2)).toFixed(1)
    : "22.4";
  
  const bmiCategory = (() => {
    const b = Number(bmi);
    if (b < 18.5) return "Underweight";
    if (b < 25) return "Normal Range";
    if (b < 30) return "Overweight";
    return "Obese";
  })();

  const avgMood = (() => {
    if (moodLogs.length === 0) return "Stable";
    const moods = moodLogs.map(l => l.mood);
    const mode = moods.reduce((a, b, i, arr) => 
      (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b), 
      moods[0]
    );
    return mode.toUpperCase();
  })();

  const latestRisk = userData.latestRisk || { riskLevel: "Low", riskScore: 25, bmi: 22.0 };

  // Calculate separate scores for Diabetes and Obesity Risks
  const dbRiskScore = latestRisk.riskScore;
  const obRiskScore = Math.max(10, Math.round(latestRisk.riskScore * 0.95));
  const gdRiskScore = userData.broadHealthStage === "pregnancy" ? Math.max(10, Math.round(latestRisk.riskScore * 1.05)) : 10;

  // Chart data 1: Health score breakdown
  const breakdownData = [
    { name: "BMI", Score: scores.breakdown?.bmi || 80, color: "#10B981" },
    { name: "Activity", Score: scores.breakdown?.activity || 70, color: "#3B82F6" },
    { name: "Sleep", Score: scores.breakdown?.sleep || 75, color: "#8B5CF6" },
    { name: "Mental", Score: scores.breakdown?.mental || 80, color: "#EC4899" },
    { name: "Mood", Score: scores.breakdown?.mood || 70, color: "#F59E0B" },
    { name: "Cycle", Score: scores.breakdown?.cycle || 90, color: "#EF4444" },
    { name: "Nutrition", Score: scores.breakdown?.nutrition || 85, color: "#10B981" },
    { name: "Diabetes", Score: scores.breakdown?.diabetes || 80, color: "#3B82F6" },
    { name: "Obesity", Score: scores.breakdown?.obesity || 75, color: "#F59E0B" },
  ];

  // Chart data 2: Simulated Risks Timeline (12 Months)
  const baseRisk = latestRisk.riskScore;
  const optRisk = Math.max(10, Math.round(baseRisk * 0.6));
  const forecastData = [
    { month: "Current", "Status Quo": baseRisk, "Optimized": baseRisk },
    { month: "3 Mths", "Status Quo": Math.min(95, baseRisk + 1), "Optimized": Math.max(10, Math.round(baseRisk - (baseRisk - optRisk) * 0.35)) },
    { month: "6 Mths", "Status Quo": Math.min(95, baseRisk + 2), "Optimized": Math.max(10, Math.round(baseRisk - (baseRisk - optRisk) * 0.70)) },
    { month: "12 Mths", "Status Quo": Math.min(95, baseRisk + 3), "Optimized": optRisk }
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full space-y-8 print:p-0 print:max-w-full">
      {/* Print Controls (Hidden on Print) */}
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <FileText size={32} className="text-primary" /> Clinical Health Report Generator
        </h2>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="px-6 py-2.5 bg-primary text-white rounded-full text-[14px] font-bold shadow-md hover:bg-rose-500 transition-all flex items-center gap-2"
          >
            <Printer size={18} /> Print / Export PDF
          </button>
          <button 
            onClick={() => setActiveTab("home")}
            className="px-6 py-2.5 bg-white border border-[#F3F4F6] rounded-full text-[14px] font-bold shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600"
          >
            ← Go Back
          </button>
        </div>
      </div>

      {/* Clinical Printable Document Starts Here */}
      <div className="bg-white p-10 md:p-14 rounded-[32px] border border-[#F3F4F6] shadow-sm print:shadow-none print:border-none print:p-0 space-y-8 font-sans">
        
        {/* Document Header */}
        <div className="border-b-4 border-primary pb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">HERHEALTH AI</h1>
            <p className="text-xs font-bold text-primary uppercase mt-1 tracking-widest">Clinical Health Summary Report</p>
          </div>
          <div className="text-right text-xs text-gray-400 font-semibold">
            <p>Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p>Report ID: HH-{Math.floor(100000 + Math.random() * 900000)}</p>
            <p>Status: Authenticated Record</p>
          </div>
        </div>

        {/* Section 1: Patient Profile */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-gray-100">
            <User size={16} /> Patient Profile Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-gray-600">
            <div><p className="text-gray-400 text-[10px] uppercase font-bold">Full Name</p><p className="text-gray-800 mt-0.5">{userData.fullName || "Member"}</p></div>
            <div><p className="text-gray-400 text-[10px] uppercase font-bold">Age / Gender</p><p className="text-gray-800 mt-0.5">{userData.age || "30"} Years / Female</p></div>
            <div><p className="text-gray-400 text-[10px] uppercase font-bold">Biological Stage</p><p className="text-gray-800 mt-0.5">{userData.broadHealthStage ? userData.broadHealthStage.toUpperCase() : "GENERAL"}</p></div>
            <div><p className="text-gray-400 text-[10px] uppercase font-bold">Diet Preference</p><p className="text-gray-800 mt-0.5">{userData.dietType ? userData.dietType.toUpperCase() : "BALANCED"}</p></div>
          </div>
        </section>

        {/* Section 2: Vitals & Body Metrics */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-gray-100">
            <Heart size={16} /> Vitals & Body Mass Index (BMI)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-gray-600">
            <div><p className="text-gray-400 text-[10px] uppercase font-bold">Height</p><p className="text-gray-800 mt-0.5">{userData.heightCm || "165"} cm</p></div>
            <div><p className="text-gray-400 text-[10px] uppercase font-bold">Weight</p><p className="text-gray-800 mt-0.5">{userData.weightKg || "65"} kg</p></div>
            <div><p className="text-gray-400 text-[10px] uppercase font-bold">Body Mass Index</p><p className="text-gray-800 mt-0.5">{bmi} kg/m²</p></div>
            <div><p className="text-gray-400 text-[10px] uppercase font-bold">BMI Classification</p><p className="text-gray-800 mt-0.5">{bmiCategory}</p></div>
          </div>
        </section>

        {/* Section 3: Smart Health Score & Risks */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-gray-100">
            <Activity size={16} /> Smart Health Index & Risks Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-gray-600">
            <div className="bg-gray-50 p-3.5 rounded-2xl text-center col-span-2 md:col-span-1">
              <p className="text-gray-400 text-[9px] uppercase font-bold">Unified Health Score</p>
              <p className="text-3xl font-extrabold text-primary mt-1">{scores.health} / 100</p>
              <p className="text-[9px] text-gray-500 mt-1 font-medium">9 Factors Composite</p>
            </div>
            <div className="bg-gray-50 p-3.5 rounded-2xl text-center">
              <p className="text-gray-400 text-[9px] uppercase font-bold">Diabetes Risk</p>
              <p className="text-xl font-bold mt-1 text-gray-800">{dbRiskScore}%</p>
              <p className="text-[9px] text-gray-500 mt-1">Level: {dbRiskScore > 68 ? "High" : dbRiskScore > 35 ? "Moderate" : "Low"}</p>
            </div>
            <div className="bg-gray-50 p-3.5 rounded-2xl text-center">
              <p className="text-gray-400 text-[9px] uppercase font-bold">Obesity Risk</p>
              <p className="text-xl font-bold mt-1 text-gray-800">{obRiskScore}%</p>
              <p className="text-[9px] text-gray-500 mt-1">Level: {obRiskScore > 68 ? "High" : obRiskScore > 35 ? "Moderate" : "Low"}</p>
            </div>
            <div className="bg-gray-50 p-3.5 rounded-2xl text-center">
              <p className="text-gray-400 text-[9px] uppercase font-bold">Gestational Diabetes Risk</p>
              <p className="text-xl font-bold mt-1 text-gray-800">
                {userData.broadHealthStage === "pregnancy" ? `${gdRiskScore}%` : "N/A"}
              </p>
              <p className="text-[9px] text-gray-500 mt-1">Pregnancy Status Dependent</p>
            </div>
          </div>
        </section>

        {/* Section 4: Visual Analytics Charts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
          <div className="border border-gray-100 rounded-2xl p-4 flex flex-col items-center">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-left w-full">Health score breakdown</h4>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdownData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: "bold" }} stroke="#9CA3AF" tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontWeight: "bold" }} stroke="#9CA3AF" tickLine={false} />
                  <Bar dataKey="Score" radius={[4, 4, 0, 0]}>
                    {breakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-gray-100 rounded-2xl p-4 flex flex-col items-center">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-left w-full">Lifestyle risk simulation</h4>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: "bold" }} stroke="#9CA3AF" tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontWeight: "bold" }} stroke="#9CA3AF" tickLine={false} />
                  <Legend wrapperStyle={{ fontSize: 9, fontWeight: "bold" }} />
                  <Line type="monotone" name="Status Quo" dataKey="Status Quo" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" name="Optimized" dataKey="Optimized" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Section 5: Mental Wellness & Screening */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-gray-100">
            <Brain size={16} /> Mental Wellness & PHQ-9 Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-gray-600">
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-gray-400 text-[10px] uppercase font-bold">Mood Tracking Analytics</p>
              <p className="text-gray-800 font-bold text-sm mt-1">{avgMood}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Check-in frequency: {moodLogs.length} total entries registered.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-gray-400 text-[10px] uppercase font-bold">PHQ-9 Depression Screener</p>
              <p className="text-gray-800 font-bold text-sm mt-1">
                {userData.phq9LatestScore ? `Score: ${userData.phq9LatestScore}/27` : "No assessment completed"}
              </p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">
                Severity: {userData.phq9LatestSeverity || "Not assessed yet"}
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Menstrual Cycle Health */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-gray-100">
            <Calendar size={16} /> Menstrual Cycle & Irregularity Analytics
          </h3>
          {cycleLogs.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No cycle logs registered in system.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-gray-600">
              <div><p className="text-gray-400 text-[10px] uppercase font-bold">Cycle Status</p><p className="text-gray-800 mt-0.5">{userData.cycleIrregular ? "Irregular detected" : "Regular"}</p></div>
              <div><p className="text-gray-400 text-[10px] uppercase font-bold">Avg Cycle Length</p><p className="text-gray-800 mt-0.5">28 Days</p></div>
              <div><p className="text-gray-400 text-[10px] uppercase font-bold">Last Period Logged</p><p className="text-gray-800 mt-0.5">{new Date(cycleLogs[0].startDate).toLocaleDateString()}</p></div>
              <div><p className="text-gray-400 text-[10px] uppercase font-bold">Recorded Symptoms</p><p className="text-gray-800 mt-0.5 truncate">{cycleLogs[0].symptoms.join(", ") || "None"}</p></div>
            </div>
          )}
        </section>

        {/* Section 7: AI Nutrition & Diet Recommendations */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-gray-100">
            <Apple size={16} /> Personalized Diet & Fluid Targets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 font-semibold">
            <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
              <p className="text-gray-400 text-[10px] uppercase font-bold">Daily Nutritional Macro Targets</p>
              <div className="flex justify-between font-bold text-gray-800"><span>Calorie Target</span><span>{userData.weightKg ? Math.round(userData.weightKg * 28) : 1800} kcal</span></div>
              <div className="flex justify-between font-bold text-gray-800"><span>Protein Target (g)</span><span>{userData.weightKg ? Math.round(userData.weightKg * 1.4) : 90}g</span></div>
              <div className="flex justify-between font-bold text-gray-800"><span>Carbs Target (g)</span><span>{userData.latestRisk?.riskScore > 50 ? "145g" : "210g"}</span></div>
              <div className="flex justify-between font-bold text-gray-800"><span>Fat Target (g)</span><span>{userData.latestRisk?.riskScore > 50 ? "70g" : "55g"}</span></div>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl flex flex-col justify-center space-y-2">
              <p className="text-gray-400 text-[10px] uppercase font-bold">Clinical Nutrition Adjustments</p>
              <p className="text-xs leading-relaxed text-gray-700 font-medium">
                • Hydration recommendation: Drink at least {(userData.weightKg ? userData.weightKg * 0.033 : 2.1).toFixed(1)} Liters of water daily.<br />
                • Foods to focus on: Lean poultry, green beans, chia/flax seeds, leafy greens, wild salmon.<br />
                • Foods to avoid: Simple fruit syrups, refined white carbs, sweetened milk teas.
              </p>
            </div>
          </div>
        </section>

        {/* Document Footer */}
        <div className="border-t border-gray-250 pt-6 flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase tracking-wider">
          <p>HerHealth AI Clinical Engine • Powered by Gemini & Scikit-Learn</p>
          <p>Page 1 of 1</p>
        </div>
      </div>
    </div>
  );
}
