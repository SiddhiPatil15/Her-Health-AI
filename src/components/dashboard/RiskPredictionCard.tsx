/**
 * RiskPredictionCard — AI metabolic risk assessment widget for the Dashboard.
 *
 * - Runs the ML prediction automatically when userData is available.
 * - Falls back gracefully if the API is offline (shows cached Firestore result).
 * - Displays a circular progress ring, BMI badge, risk label, and insights.
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Brain, CheckCircle, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { useRiskPrediction } from "@/hooks/useRiskPrediction";
import type { PredictionInput } from "@/lib/api";

// ─── Config per risk level ────────────────────────────────────────────────────

const RISK_CONFIG = {
  Low: {
    ringColor: "#4CAF8D",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle,
    label: "Low Risk",
    summary: "Great metabolic health. Keep up your current habits!",
  },
  Moderate: {
    ringColor: "#F2A65A",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: TrendingUp,
    label: "Moderate Risk",
    summary: "Some areas need attention. Small changes make a big difference.",
  },
  High: {
    ringColor: "#E56B8A",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    Icon: AlertTriangle,
    label: "High Risk",
    summary: "Please consult a healthcare provider and consider lifestyle changes.",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInput(userData: Record<string, unknown>): PredictionInput | null {
  if (!userData?.age || !userData?.heightCm || !userData?.weightKg) return null;

  const stage = (userData.broadHealthStage as string | undefined) ?? "general";

  return {
    age: Number(userData.age),
    heightCm: Number(userData.heightCm),
    weightKg: Number(userData.weightKg),
    activityLevel: (userData.activityLevel as PredictionInput["activityLevel"]) ?? "moderate",
    sleepHours: Number(userData.sleepHours ?? 7),
    dietType: (userData.dietType as PredictionInput["dietType"]) ?? "balanced",
    diabetesHistory: (userData.diabetesHistory as PredictionInput["diabetesHistory"]) ?? "no",
    bloodPressure: (userData.bloodPressure as PredictionInput["bloodPressure"]) ?? "normal",
    broadHealthStage: (["pregnancy", "menopause", "general"].includes(stage)
      ? stage
      : "general") as PredictionInput["broadHealthStage"],
  };
}

/** 
 * Fallback calculator for when the ML API is unreachable.
 * Higher score = Higher Risk.
 */
function calculateRuleBasedScore(input: PredictionInput): { score: number; level: "Low" | "Moderate" | "High" } {
  let score = 20; // baseline

  // BMI Factor
  const bmi = input.weightKg / Math.pow(input.heightCm / 100, 2);
  if (bmi >= 30) score += 40;
  else if (bmi >= 25) score += 20;
  
  // Activity Factor
  if (input.activityLevel === "sedentary") score += 20;
  else if (input.activityLevel === "light") score += 10;
  else if (input.activityLevel === "very") score -= 5;

  // Sleep Factor
  if (input.sleepHours < 6 || input.sleepHours > 9) score += 15;

  // History Factor
  if (input.diabetesHistory !== "no") score += 20;
  if (input.bloodPressure !== "normal") score += 15;

  // Age factor
  if (input.age > 45) score += 10;

  // Clamp and level
  const finalScore = Math.min(Math.max(score, 5), 95);
  let level: "Low" | "Moderate" | "High" = "Low";
  if (finalScore > 65) level = "High";
  else if (finalScore > 35) level = "Moderate";

  return { score: finalScore, level };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userData: any;
}

export default function RiskPredictionCard({ userData }: Props) {
  const { prediction, loading, error, run } = useRiskPrediction();

  // Run prediction once when profile data is ready and no cached Firestore result exists
  useEffect(() => {
    if (userData?.latestRisk) return; // cached result takes precedence on first load
    const input = buildInput(userData ?? {});
    if (input) run(input);
    // Only re-run if the uid changes (new login)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.uid]);

  // Prefer live prediction over cached Firestore value
  const input = buildInput(userData ?? {});
  const fallback = input ? calculateRuleBasedScore(input) : { score: 0, level: "Low" as const };

  const riskLevel: "Low" | "Moderate" | "High" =
    prediction?.riskLevel ?? userData?.latestRisk?.riskLevel ?? fallback.level;
  const riskScore: number =
    prediction?.riskScore ?? userData?.latestRisk?.riskScore ?? fallback.score;
  const bmiVal: number = prediction?.bmi ?? userData?.latestRisk?.bmi ?? (input ? (input.weightKg / Math.pow(input.heightCm / 100, 2)) : 0);
  const insights: string[] = prediction?.insights ?? [];

  const cfg = RISK_CONFIG[riskLevel];
  const { Icon } = cfg;

  // SVG ring math
  const RADIUS = 38;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeOffset = ((100 - riskScore) / 100) * CIRCUMFERENCE;

  const handleRefresh = () => {
    const input = buildInput(userData ?? {});
    if (input) run(input);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] p-6 border border-[#F3F4F6] shadow-sm hover:shadow-md transition-shadow"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: cfg.ringColor + "20" }}
          >
            <Brain className="w-5 h-5" style={{ color: cfg.ringColor }} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              AI Risk Assessment
            </p>
            <p className="text-[15px] font-bold text-[#1F2937]">{cfg.label}</p>
          </div>
        </div>

        {/* Circular progress ring */}
        <div className="relative w-[84px] h-[84px] shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
            <circle
              cx="44" cy="44" r={RADIUS}
              fill="none" stroke="#F3F4F6" strokeWidth="8"
            />
            <circle
              cx="44" cy="44" r={RADIUS}
              fill="none"
              stroke={cfg.ringColor}
              strokeWidth="8"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <span className="text-[20px] font-bold text-[#1F2937] leading-none">
                  {Math.round(riskScore)}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">/100</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Risk badge + BMI ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-bold border ${cfg.badgeClass}`}
        >
          <Icon className="w-3.5 h-3.5" />
          {cfg.label}
        </span>
        {bmiVal > 0 && (
          <span className="text-[12px] text-muted-foreground">
            BMI&nbsp;
            <strong className="text-[#1F2937]">{bmiVal.toFixed(1)}</strong>
            &nbsp;
            <span>
              {bmiVal < 18.5
                ? "· Underweight"
                : bmiVal < 25
                ? "· Normal"
                : bmiVal < 30
                ? "· Overweight"
                : "· Obese"}
            </span>
          </span>
        )}
      </div>

      <p className="text-[13px] text-muted-foreground mb-4">{cfg.summary}</p>

      {/* ── AI Insights ── */}
      {insights.length > 0 && (
        <div className="space-y-2 mb-4">
          {insights.slice(0, 3).map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-3 rounded-2xl bg-[#F8F9FA]"
            >
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: cfg.ringColor }}
              />
              <p className="text-[12px] text-[#374151] leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── API offline notice ── */}
      {error && (
        <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-2.5 mb-3">
          ⚠ Prediction service offline — showing rule-based estimate.
        </p>
      )}

      {/* ── Refresh button ── */}
      <button
        onClick={handleRefresh}
        disabled={loading || !buildInput(userData ?? {})}
        className="flex items-center gap-1.5 text-[12px] font-bold text-primary hover:opacity-80 disabled:opacity-40 transition-opacity"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Analysing…" : "Refresh Assessment"}
      </button>
    </motion.div>
  );
}
