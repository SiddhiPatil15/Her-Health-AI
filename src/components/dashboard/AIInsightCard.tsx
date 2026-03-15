import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface AIInsightCardProps {
  insights: string[];
  onViewMore?: () => void;
}

const AIInsightCard = ({ insights, onViewMore }: AIInsightCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6 card-shadow border border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg gradient-purple flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-secondary-foreground" />
        </div>
        <h3 className="text-h3 text-foreground">AI Insights</h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
            <div className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0" />
            <p className="text-body text-foreground">{insight}</p>
          </div>
        ))}
      </div>
      {onViewMore && (
        <button
          onClick={onViewMore}
          className="mt-4 text-body font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View AI Recommendations →
        </button>
      )}
    </motion.div>
  );
};

export default AIInsightCard;
