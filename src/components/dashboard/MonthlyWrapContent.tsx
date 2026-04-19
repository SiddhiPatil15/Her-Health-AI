import { motion } from "framer-motion";
import { TrendingUp, Footprints, Moon, Heart, ArrowRight } from "lucide-react";
import { DailyHealthLog } from "@/lib/healthService";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

interface MonthlyWrapContentProps {
  logs: DailyHealthLog[];
  currentMonth: string;
}

export const MonthlyWrapContent = ({ logs, currentMonth }: MonthlyWrapContentProps) => {
  // Compute stats
  const totalSteps = logs.reduce((sum, l) => sum + (l.steps || 0), 0);
  const avgSleep = logs.length > 0 ? (logs.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / logs.length).toFixed(1) : "0";
  const latestWeight = logs[0]?.weightKg || 0;
  const firstWeight = logs[logs.length - 1]?.weightKg || 0;
  const weightChange = (firstWeight - latestWeight).toFixed(1);
  
  const wins = [
    { icon: Footprints, text: `You walked ${(totalSteps / 1312).toFixed(1)} km this month`, color: "bg-purple-50 text-purple-600" },
    { icon: Moon, text: `Average sleep: ${avgSleep} hours`, color: "bg-emerald-50 text-emerald-600" },
    { icon: TrendingUp, text: `Logged health for ${logs.length} days`, color: "bg-rose-50 text-rose-600" },
    { icon: Heart, text: `Weight change: ${weightChange} kg`, color: "bg-orange-50 text-orange-600" },
  ];

  const insights = logs.length > 5 ? [
    totalSteps > 50000 ? "Excellent activity! Your high step count is great for metabolic health." : "Try to increase your daily steps for better heart health.",
    Number(avgSleep) >= 7 ? "You're getting enough sleep! This is crucial for hormonal balance." : "Aim for slightly more sleep to improve your energy levels.",
    "Your consistency in logging shows great commitment to your health journey."
  ] : [
    "Start logging more consistently to see detailed health insights.",
    "Track your sleep and activity daily for a better monthly wrap.",
    "Consistency is key to understanding your health patterns."
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      {/* Header */}
      <motion.div
        initial="hidden" animate="visible"
        className="bg-primary rounded-[40px] p-10 text-center text-white"
      >
        <motion.p variants={fadeUp} custom={0} className="text-[14px] font-medium opacity-80 mb-2 uppercase tracking-widest">Monthly Wrap</motion.p>
        <motion.h1 variants={fadeUp} custom={1} className="text-[40px] font-bold mb-2">{currentMonth}</motion.h1>
        <motion.p variants={fadeUp} custom={2} className="text-[16px] opacity-80 font-medium">Your health journey at a glance</motion.p>
      </motion.div>

      {/* Big Wins */}
      <motion.div initial="hidden" animate="visible">
        <h2 className="text-[24px] font-bold text-[#1F2937] mb-6">🏆 Monthly Achievements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {wins.map(({ icon: Icon, text, color }, i) => (
            <motion.div
              key={i}
              variants={fadeUp} custom={i}
              className="bg-white rounded-[32px] p-8 border border-[#F3F4F6] shadow-sm hover:shadow-md transition-all group"
            >
              <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-[18px] font-bold text-[#1F2937] leading-tight">{text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* AI Health Insights */}
      <motion.div initial="hidden" animate="visible">
        <h2 className="text-[24px] font-bold text-[#1F2937] mb-6">🧠 AI Health Insights</h2>
        <motion.div variants={fadeUp} custom={1} className="bg-white rounded-[40px] p-8 border border-[#F3F4F6] shadow-sm space-y-4">
          {insights.map((text, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-[24px] bg-gray-50 border border-transparent hover:border-primary/10 transition-all">
              <div className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0 shadow-sm shadow-primary/40" />
              <p className="text-[15px] text-[#4B5563] font-medium leading-relaxed">{text}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};
