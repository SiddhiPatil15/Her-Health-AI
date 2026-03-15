import { motion } from "framer-motion";
import { Download, Share2, TrendingUp, Footprints, Moon, Heart, ArrowRight } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const MonthlyWrap = () => {
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
              <motion.h1 variants={fadeUp} custom={1} className="text-[36px] font-bold mb-2">Health Wrap – March 2026</motion.h1>
              <motion.p variants={fadeUp} custom={2} className="text-body opacity-80">Here's how your health journey went this month</motion.p>
            </motion.div>

            {/* Big Wins */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.h2 variants={fadeUp} custom={0} className="text-h1 text-foreground mb-4">🏆 Big Wins</motion.h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Footprints, text: "You walked 42 km this month", color: "gradient-purple" },
                  { icon: Moon, text: "Your sleep improved by 16%", color: "gradient-success" },
                  { icon: TrendingUp, text: "Metabolic risk decreased by 8%", color: "gradient-primary" },
                  { icon: Heart, text: "Health score reached 72 — your best!", color: "gradient-peach" },
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

            {/* AI Health Insights */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <motion.h2 variants={fadeUp} custom={0} className="text-h1 text-foreground mb-4">🧠 Health Insights</motion.h2>
              <motion.div variants={fadeUp} custom={1} className="bg-card rounded-2xl p-6 card-shadow border border-border space-y-4">
                {[
                  "Your consistent morning walks contributed most to your metabolic improvement.",
                  "Improved sleep quality correlates with reduced hot flash frequency.",
                  "Your hydration levels have been steady — keep it up for hormonal balance.",
                ].map((text, i) => (
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
                {[
                  "Improve sleep consistency — aim for the same bedtime each night.",
                  "Increase water intake by 0.4L to reach your daily goal.",
                  "Try 10 minutes of meditation to manage mood changes.",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-body text-foreground">{text}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Actions */}
            <div className="flex gap-4 justify-center pb-8">
              <button className="px-6 py-3 gradient-primary text-primary-foreground rounded-xl text-body font-medium hover-lift flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Share Report
              </button>
              <button className="px-6 py-3 bg-card border border-border text-foreground rounded-xl text-body font-medium hover-lift flex items-center gap-2">
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
