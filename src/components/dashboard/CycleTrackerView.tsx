import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { getCycleLogs, saveCycleLog, CycleLog } from "@/lib/healthService";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/api";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  TrendingUp, 
  Activity, 
  Sparkles,
  Droplets,
  HeartHandshake,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2
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
  CartesianGrid
} from "recharts";

const SYMPTOMS_LIST = [
  { id: "cramps", label: "Cramps ⚡" },
  { id: "bloating", label: "Bloating 🎈" },
  { id: "headache", label: "Headache 🤕" },
  { id: "fatigue", label: "Fatigue 🥱" },
  { id: "mood swings", label: "Mood Swings 🎭" },
  { id: "backache", label: "Backache 🪵" },
  { id: "acne", label: "Acne 🔴" }
];

export default function CycleTrackerView({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // AI Insights State
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Log form state
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState(5);
  const [intensity, setIntensity] = useState<"light" | "medium" | "heavy">("medium");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [showAddLog, setShowAddLog] = useState(false);

  // Calendar navigation state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchAICycleInsights = async (currentLogs: CycleLog[]) => {
    setLoadingAi(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const cycleSummaryText = currentLogs.map(l => 
        `Start Date: ${l.startDate}, Period Duration: ${l.durationDays} days, Flow: ${l.flowIntensity}, Symptoms: ${l.symptoms.join(', ')}`
      ).join('\n');

      const avgLen = currentLogs.length < 2 ? 28 : (() => {
        let totalDays = 0;
        let counts = 0;
        for (let i = 0; i < currentLogs.length - 1; i++) {
          const d1 = new Date(currentLogs[i].startDate);
          const d2 = new Date(currentLogs[i + 1].startDate);
          const diff = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
          if (diff > 15 && diff < 45) {
            totalDays += diff;
            counts++;
          }
        }
        return counts > 0 ? Math.round(totalDays / counts) : 28;
      })();

      const prompt = `Based on my menstrual cycle log history:\n${cycleSummaryText || "No logs yet."}\nAverage Cycle Length: ${avgLen} days.\nProvide tailored recommendations (2 short paragraphs) for:
1. My metabolic health, hormonal balance, and insulin levels based on my symptoms and regularity.
2. Lifestyle and diet improvements (e.g. seeds, fiber, exercise type) to balance blood sugars. Keep recommendations direct and specific to my profile.`;

      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          userData: {
            broadHealthStage: "general",
            age: 30
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiInsights(data.response);
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      console.error(err);
      setAiInsights("Hormones (estrogen/progesterone) fluctuate heavily. Keep a stable intake of dietary fibers, magnesium-rich seeds (sesame, sunflower), and complex carbs to regulate blood sugar spikes, especially during your luteal phase.");
    } finally {
      setLoadingAi(false);
    }
  };

  const fetchLogs = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const cycleLogs = await getCycleLogs(user.uid, 50);
      setLogs(cycleLogs);
      if (cycleLogs.length > 0) {
        fetchAICycleInsights(cycleLogs);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load menstrual logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomToggle = (sym: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    try {
      const newLog: Omit<CycleLog, "createdAt"> = {
        startDate,
        durationDays: Number(duration),
        flowIntensity: intensity,
        symptoms: selectedSymptoms,
        notes: notes.trim() || undefined
      };

      await saveCycleLog(user.uid, newLog);
      toast.success("Period log saved successfully!");
      setShowAddLog(false);
      // Reset form
      setStartDate(new Date().toISOString().split("T")[0]);
      setDuration(5);
      setIntensity("medium");
      setSelectedSymptoms([]);
      setNotes("");
      fetchLogs();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save log.");
    }
  };

  // Calculations
  const averageCycleLength = 28; // default fallback
  const calculatedAvgLength = (() => {
    if (logs.length < 2) return averageCycleLength;
    let totalDays = 0;
    let counts = 0;
    // logs sorted by startDate desc
    for (let i = 0; i < logs.length - 1; i++) {
      const d1 = new Date(logs[i].startDate);
      const d2 = new Date(logs[i + 1].startDate);
      const diff = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 15 && diff < 45) { // reasonable cycle boundaries
        totalDays += diff;
        counts++;
      }
    }
    return counts > 0 ? Math.round(totalDays / counts) : averageCycleLength;
  })();

  const averagePeriodDuration = (() => {
    if (logs.length === 0) return 5;
    const sum = logs.reduce((acc, l) => acc + l.durationDays, 0);
    return Math.round(sum / logs.length);
  })();

  // Irregularity Alert
  const cycleIrregular = (() => {
    if (logs.length < 3) return false;
    const lengths: number[] = [];
    for (let i = 0; i < logs.length - 1; i++) {
      const d1 = new Date(logs[i].startDate);
      const d2 = new Date(logs[i + 1].startDate);
      const diff = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 15 && diff < 45) {
        lengths.push(diff);
      }
    }
    if (lengths.length < 2) return false;
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    return stdDev > 3; // Standard deviation > 3 days means irregular cycle
  })();

  // Predictions based on last logged period
  const lastLog = logs[0];
  const lastPeriodStart = lastLog ? new Date(lastLog.startDate) : null;

  const predictions = (() => {
    if (!lastPeriodStart) return null;

    const nextPeriodDate = new Date(lastPeriodStart);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + calculatedAvgLength);

    const ovulationDate = new Date(lastPeriodStart);
    ovulationDate.setDate(ovulationDate.getDate() + calculatedAvgLength - 14);

    const fertileStart = new Date(ovulationDate);
    fertileStart.setDate(fertileStart.getDate() - 5);

    const fertileEnd = new Date(ovulationDate);
    fertileEnd.setDate(fertileEnd.getDate() + 1);

    const pmsStart = new Date(nextPeriodDate);
    pmsStart.setDate(pmsStart.getDate() - 7);

    const pmsEnd = new Date(nextPeriodDate);
    pmsEnd.setDate(pmsEnd.getDate() - 1);

    return {
      nextPeriod: nextPeriodDate,
      ovulation: ovulationDate,
      fertileStart,
      fertileEnd,
      pmsStart,
      pmsEnd
    };
  })();

  // Month Calendar builder
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper to determine day types for calendar rendering
  const getDayStatus = (dayNum: number) => {
    const targetDate = new Date(currentYear, currentMonth, dayNum);
    const dateStr = targetDate.toISOString().split("T")[0];

    // 1. Check logged period days
    for (const log of logs) {
      const start = new Date(log.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + log.durationDays - 1);

      // Set time to midnight for exact comparison
      const checkDate = new Date(targetDate.setHours(0,0,0,0));
      const startDateVal = new Date(start.setHours(0,0,0,0));
      const endDateVal = new Date(end.setHours(0,0,0,0));

      if (checkDate >= startDateVal && checkDate <= endDateVal) {
        return { type: "period", flow: log.flowIntensity, symptoms: log.symptoms };
      }
    }

    // 2. Check predictions
    if (predictions) {
      const checkDate = new Date(targetDate.setHours(0,0,0,0));
      const nextPeriodStart = new Date(new Date(predictions.nextPeriod).setHours(0,0,0,0));
      const nextPeriodEnd = new Date(nextPeriodStart);
      nextPeriodEnd.setDate(nextPeriodEnd.getDate() + averagePeriodDuration - 1);

      if (checkDate >= nextPeriodStart && checkDate <= nextPeriodEnd) {
        return { type: "predicted-period" };
      }

      const ovulation = new Date(new Date(predictions.ovulation).setHours(0,0,0,0));
      if (checkDate.getTime() === ovulation.getTime()) {
        return { type: "ovulation" };
      }

      const fertileStart = new Date(new Date(predictions.fertileStart).setHours(0,0,0,0));
      const fertileEnd = new Date(new Date(predictions.fertileEnd).setHours(0,0,0,0));
      if (checkDate >= fertileStart && checkDate <= fertileEnd) {
        return { type: "fertile" };
      }

      const pmsStart = new Date(new Date(predictions.pmsStart).setHours(0,0,0,0));
      const pmsEnd = new Date(new Date(predictions.pmsEnd).setHours(0,0,0,0));
      if (checkDate >= pmsStart && checkDate <= pmsEnd) {
        return { type: "pms" };
      }
    }

    return null;
  };

  // Symptom charts data formulation
  const symptomData = (() => {
    const freq: Record<string, number> = {};
    logs.forEach(l => {
      l.symptoms.forEach(s => {
        const name = s.charAt(0).toUpperCase() + s.slice(1);
        freq[name] = (freq[name] || 0) + 1;
      });
    });
    return Object.entries(freq).map(([name, count]) => ({ name, count }));
  })();

  const cycleHistoryData = [...logs]
    .reverse()
    .slice(-6)
    .map((l, index, arr) => {
      if (index === 0) return null;
      const prev = arr[index - 1];
      const d1 = new Date(l.startDate);
      const d2 = new Date(prev.startDate);
      const length = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
      return {
        date: new Date(l.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        "Cycle Length": length
      };
    })
    .filter(Boolean);

  // AI Metabolic / Stage Tips based on Predictions
  const getCycleStageTip = () => {
    if (!predictions) {
      return "Log your last period to receive personalized metabolic health cycle insights.";
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    const pStart = predictions.fertileStart;
    const pEnd = predictions.fertileEnd;
    const ov = predictions.ovulation;
    const nextP = predictions.nextPeriod;

    if (today >= pStart && today <= pEnd) {
      return "Fertile Window: Estrogen levels are peaking. Your body is highly insulin sensitive. Great phase for moderate-intensity workouts and complex carbs.";
    }
    if (today.getTime() === ov.setHours(0,0,0,0)) {
      return "Ovulation Day: High LH surge. Focus on zinc and magnesium-rich seeds. A brief post-meal walk will help manage estrogen-driven insulin spikes.";
    }
    
    // PMS phase (approx 7 days before period)
    const pmsStart = new Date(nextP);
    pmsStart.setDate(pmsStart.getDate() - 7);
    if (today >= pmsStart && today < nextP) {
      return "Luteal / PMS Phase: Progesterone is high, raising resting heart rate. Calorie needs increase by 100-200 kcal. Avoid high sugar; focus on healthy fats and magnesium to control cravings.";
    }

    return "Follicular Phase: Estrogen is rising, and metabolic rate is stable. Excellent phase for cardiovascular workouts. Focus on a balanced diet with plant fibers.";
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <CalendarIcon size={32} className="text-[#FF758C]" /> Menstrual Cycle & Fertility Tracking
        </h2>
        <button 
          onClick={() => setActiveTab("home")}
          className="px-6 py-2.5 bg-white border border-[#F3F4F6] rounded-full text-[14px] font-bold shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600"
        >
          ← Go Back
        </button>
      </div>

      {predictions && (
        <div className="space-y-4">
          <div className="bg-[#FFE4E8] rounded-[24px] p-6 border border-rose-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                <Sparkles className="w-7 h-7 text-[#FF758C]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">AI Cycle Insight</h3>
                <p className="text-sm text-gray-700 mt-1 max-w-2xl font-medium leading-relaxed">
                  {getCycleStageTip()}
                </p>
              </div>
            </div>
            <div className="shrink-0 bg-white px-5 py-3 rounded-2xl border border-rose-200 text-center">
              <p className="text-xs text-rose-500 font-bold uppercase tracking-wider">Avg Cycle Length</p>
              <p className="text-2xl font-bold text-gray-800 mt-0.5">{calculatedAvgLength} Days</p>
            </div>
          </div>

          {loadingAi ? (
            <div className="bg-purple-50 rounded-[24px] p-6 border border-purple-100 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              <p className="text-sm font-semibold text-purple-700">Analysing your cycle logs and symptoms with Gemini AI...</p>
            </div>
          ) : aiInsights ? (
            <div className="bg-purple-50 rounded-[24px] p-6 border border-purple-100 flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                <Sparkles className="w-7 h-7 text-purple-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-purple-900">AI Personalized Metabolic & Cycle Analysis</h3>
                <p className="text-xs text-purple-800 mt-1.5 leading-relaxed font-semibold whitespace-pre-line max-w-4xl">
                  {aiInsights}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Grid: Calendar & Log form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calendar widget */}
        <div className="lg:col-span-8 bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{monthNames[currentMonth]} {currentYear}</h3>
              <p className="text-xs text-gray-400 mt-0.5 font-semibold">Tracked Period & Predicted Fertile Window</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-rose-50 rounded-xl transition-colors border border-gray-100 text-gray-600"><ChevronLeft size={18} /></button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-rose-50 rounded-xl transition-colors border border-gray-100 text-gray-600"><ChevronRight size={18} /></button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-4 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <span key={d} className="text-xs font-bold text-gray-400 uppercase py-1">{d}</span>
            ))}
            
            {/* Empty days before month starts */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-12 md:h-14"></div>
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const status = getDayStatus(dayNum);
              let dayStyles = "hover:bg-rose-50 text-gray-700 font-semibold";
              let titleText = "";
              
              if (status?.type === "period") {
                dayStyles = "bg-rose-500 text-white shadow-sm shadow-rose-200 hover:bg-rose-600";
                titleText = `Period logged (${status.flow} flow)`;
              } else if (status?.type === "predicted-period") {
                dayStyles = "bg-rose-100 border-2 border-dashed border-rose-400 text-rose-700 hover:bg-rose-200";
                titleText = "Predicted Period Start";
              } else if (status?.type === "ovulation") {
                dayStyles = "bg-purple-600 text-white shadow-sm shadow-purple-200 hover:bg-purple-700";
                titleText = "Predicted Ovulation Day";
              } else if (status?.type === "fertile") {
                dayStyles = "bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200";
                titleText = "Predicted Fertile Window";
              } else if (status?.type === "pms") {
                dayStyles = "bg-amber-100 border border-dashed border-amber-300 text-amber-700 hover:bg-amber-200";
                titleText = "Predicted PMS Window";
              }

              return (
                <div 
                  key={`day-${dayNum}`} 
                  title={titleText}
                  className={`h-12 md:h-14 rounded-2xl flex flex-col items-center justify-center text-sm cursor-pointer transition-all relative ${dayStyles}`}
                  onClick={() => {
                    const selected = new Date(currentYear, currentMonth, dayNum).toISOString().split("T")[0];
                    setStartDate(selected);
                    setShowAddLog(true);
                  }}
                >
                  <span>{dayNum}</span>
                  {status?.type === "ovulation" && <span className="absolute bottom-1 text-[8px]">💜</span>}
                  {status?.type === "period" && status.symptoms.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></span>}
                </div>
              );
            })}
          </div>

          {/* Calendar Legends */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100 justify-center">
            <LegendItem color="bg-rose-500" label="Logged Period" />
            <LegendItem color="bg-rose-100 border border-dashed border-rose-400" label="Predicted Period" />
            <LegendItem color="bg-purple-600" label="Ovulation Day" />
            <LegendItem color="bg-purple-100" label="Fertility Window" />
            <LegendItem color="bg-amber-100 border border-dashed border-amber-300" label="PMS Window" />
          </div>
        </div>

        {/* Quick details & Irregularity Warnings */}
        <div className="lg:col-span-4 space-y-6">
          <button 
            onClick={() => setShowAddLog(!showAddLog)}
            className="w-full py-4 gradient-primary text-white rounded-3xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Log Period Dates
          </button>

          {predictions && (
            <section className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
              <h4 className="font-bold text-gray-800 text-md mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-rose-500" /> Predictions</h4>
              <div className="space-y-4">
                <PredictRow label="Next Period Date" value={predictions.nextPeriod.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} icon="🩸" />
                <PredictRow label="Ovulation Date" value={predictions.ovulation.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} icon="🥚" />
                <PredictRow 
                  label="Fertility Window" 
                  value={`${predictions.fertileStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${predictions.fertileEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`} 
                  icon="💖" 
                />
              </div>
            </section>
          )}

          {cycleIrregular && (
            <div className="bg-amber-50 border border-amber-200 rounded-[28px] p-5 flex gap-3 text-amber-800">
              <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500" />
              <div>
                <p className="font-bold text-sm">Irregular Cycle Detected</p>
                <p className="text-xs mt-1 leading-relaxed text-amber-700">
                  Your cycle duration varies significantly. Hormonal variability can influence your metabolic rate and insulin levels. Consider speaking with an OB-GYN or checking the diet plans to stabilize blood sugars.
                </p>
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <section className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
              <h4 className="font-bold text-gray-800 text-md mb-4 flex items-center gap-2"><Droplets size={18} className="text-blue-500" /> Cycle Summary</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between font-medium"><span className="text-gray-500">Avg Period Duration</span><span className="font-bold text-gray-800">{averagePeriodDuration} Days</span></div>
                <div className="flex justify-between font-medium"><span className="text-gray-500">Last Period Start</span><span className="font-bold text-gray-800">{new Date(logs[0].startDate).toLocaleDateString()}</span></div>
                {logs[0].notes && (
                  <div className="pt-2 border-t border-gray-55 mt-2">
                    <p className="text-xs text-gray-400 font-bold uppercase">Last Note</p>
                    <p className="text-xs text-gray-650 mt-1 italic">"{logs[0].notes}"</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Overlay Add Period log dialog */}
      {showAddLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl border border-gray-100"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">🩸 Log Period Dates</h3>
            <form onSubmit={handleSaveLog} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Period Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-[#F3F4F6] border-none p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Duration (Days)</label>
                <input 
                  type="number" 
                  min={1} max={15}
                  value={duration} 
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full bg-[#F3F4F6] border-none p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Flow Intensity</label>
                <div className="grid grid-cols-3 gap-2">
                  {["light", "medium", "heavy"].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setIntensity(f as any)}
                      className={`py-2.5 rounded-xl font-bold text-xs uppercase transition border ${
                        intensity === f 
                          ? "bg-rose-500 text-white border-rose-500" 
                          : "bg-gray-50 border-gray-100 text-gray-650 hover:bg-gray-100"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Symptoms Experienced</label>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOMS_LIST.map(sym => (
                    <button
                      key={sym.id}
                      type="button"
                      onClick={() => handleSymptomToggle(sym.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        selectedSymptoms.includes(sym.id)
                          ? "bg-purple-100 text-purple-700 border-purple-300"
                          : "bg-gray-50 border-gray-100 text-gray-655 hover:bg-gray-100"
                      }`}
                    >
                      {sym.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Personal Notes (Optional)</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Spotting, stress levels, exercise notes..."
                  className="w-full bg-[#F3F4F6] border-none p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddLog(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-primary hover:bg-rose-500 text-white font-bold rounded-2xl transition"
                >
                  Save Log
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Visualizations row: Symptoms & Cycle Length */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Activity size={18} className="text-purple-500" /> Symptom Frequency</h3>
          {symptomData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 font-bold">No symptoms logged yet.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symptomData}>
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} fontWeight="bold" tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#A78BFA" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-rose-500" /> Cycle Length Trend</h3>
          {cycleHistoryData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 font-bold">Log periods over multiple months to track trends.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cycleHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} fontWeight="bold" tickLine={false} domain={[20, 40]} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="Cycle Length" stroke="#FF758C" strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3.5 h-3.5 rounded-full ${color}`}></div>
      <span className="text-xs font-bold text-gray-600">{label}</span>
    </div>
  );
}

function PredictRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-bold text-gray-500">{label}</span>
      </div>
      <span className="text-xs font-bold text-gray-800">{value}</span>
    </div>
  );
}
