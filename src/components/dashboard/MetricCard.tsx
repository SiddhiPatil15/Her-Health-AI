import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  gradient?: string;
}

const MetricCard = ({ title, value, change, changeType = "neutral", icon: Icon, gradient }: MetricCardProps) => {
  const changeColor = changeType === "positive" ? "text-success" : changeType === "negative" ? "text-destructive" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6 card-shadow hover-lift border border-border"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient || 'gradient-primary'}`}>
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        {change && (
          <span className={`text-caption font-medium ${changeColor}`}>{change}</span>
        )}
      </div>
      <p className="text-caption text-muted-foreground mb-1">{title}</p>
      <p className="text-h2 text-foreground">{value}</p>
    </motion.div>
  );
};

export default MetricCard;
