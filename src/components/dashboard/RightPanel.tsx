import { Pencil, MessageCircle } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const RightPanel = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "What happens in Menopause and how does it feel?",
      a: "For some women the loss of reproductive ability may be deeply felt. The diminishing release of oestrogen from the ovary as women advance into their 40s is often the cause of symptoms which can be distressing."
    },
    {
      q: "What is the menopause?",
      a: "The menopause refers to that time in every woman's life when her periods stop and her ovaries lose their reproductive function. Usually this occurs between ages 45 and 55."
    }
  ];

  return (
    <div className="w-80 min-h-screen bg-card border-l border-border p-6 space-y-6 overflow-y-auto shrink-0 hidden xl:block">
      {/* Patient Details */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-card rounded-2xl p-5 border border-border card-shadow"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h3 text-foreground">Details</h3>
          <button className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2.5">
          {[
            { label: "Age Group", value: "40 - 55" },
            { label: "Menstrual Period", value: "3 - 6 Months Ago" },
            { label: "Hot Flashes", value: "3" },
            { label: "Sleep Disturbance", value: "4" },
            { label: "Mood Changes", value: "6" },
            { label: "History", value: "Diabetes" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-caption text-muted-foreground">{label}</span>
              <span className="text-caption font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* FAQ */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-h3 text-foreground">FAQ</h3>
          <button className="text-caption font-medium text-primary">View All</button>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-border p-3 cursor-pointer" onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0" />
                <p className="text-caption font-medium text-foreground">{faq.q}</p>
              </div>
              {expandedFaq === i && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-caption text-muted-foreground mt-2 pl-4"
                >
                  {faq.a}
                </motion.p>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI Quick Tip */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-4 bg-primary-tint border border-primary/10"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-caption font-semibold text-primary">💡 AI Quick Tip</span>
        </div>
        <p className="text-caption text-foreground">
          20 minutes of walking daily can significantly reduce metabolic risk during menopause.
        </p>
      </motion.div>

      {/* Chat Widget */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-h3 text-foreground mb-3">Chat with AI Doctor</h3>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full gradient-purple flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-secondary-foreground" />
          </div>
          <div className="flex-1 relative">
            <input
              placeholder="Type here..."
              className="w-full px-4 py-2.5 bg-muted rounded-xl text-body placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RightPanel;
