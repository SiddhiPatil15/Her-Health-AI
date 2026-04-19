/**
 * RiskPredictionCard — AI metabolic risk assessment widget for the Dashboard.
 *
 * - Runs the ML prediction automatically when userData is available.
 * - Falls back gracefully if the API is offline (shows rule-based estimate).
 * - Displays a circular progress ring, BMI badge, risk label, and insights.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Brain, CheckCircle, Loader2, RefreshCw, TrendingUp, AlertCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import type { PredictionInput, PredictionResult } from "@/lib/api";
import { saveRiskRecord } from "@/lib/healthService";

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

// ─── Build prediction input from user data ────────────────────────────────────

function buildInput(userData: Record<string, unknown>): PredictionInput | null {
  const age = Number(userData?.age);
  const heightCm = Number(userData?.heightCm);
  const weightKg = Number(userData?.weightKg);
  if (!age || !heightCm || !weightKg) return null;

  const stage = (userData.broadHealthStage as string | undefined) ?? "general";

  return {
    age,
    heightCm,
    weightKg,
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

/** Rule-based fallback (higher score = higher risk) */
function calculateRuleBasedScore(input: PredictionInput): { score: number; level: "Low" | "Moderate" | "High"; insights: string[] } {
  let score = 20;
  const insights: string[] = [];

  const bmi = input.weightKg / Math.pow(input.heightCm / 100, 2);
  if (bmi >= 30) { score += 40; insights.push("BMI indicates obesity — a primary risk factor for Type 2 diabetes."); }
  else if (bmi >= 25) { score += 20; insights.push("BMI indicates overweight — moderate obesity risk. Aim for BMI under 25."); }
  else { insights.push("BMI is in the normal range — good for metabolic health."); }

  if (input.activityLevel === "sedentary") { score += 20; insights.push("Sedentary lifestyle significantly raises diabetes and obesity risk. Aim for 30 min/day."); }
  else if (input.activityLevel === "light") score += 10;
  else if (input.activityLevel === "very") score -= 5;

  if (input.sleepHours < 6 || input.sleepHours > 9) { score += 15; insights.push("Sleep outside 7–8 hrs/night disrupts insulin regulation and increases weight gain risk."); }
  if (input.diabetesHistory !== "no") { score += 20; insights.push("Your diabetes history is a significant risk factor — regular monitoring is advised."); }
  if (input.bloodPressure !== "normal") { score += 15; insights.push("Elevated blood pressure is linked to metabolic syndrome. Monitor regularly."); }
  if (input.age > 45) { score += 10; insights.push("Age 45+ increases metabolic risk — especially relevant for menopause stage."); }

  const finalScore = Math.min(Math.max(score, 5), 95);
  let level: "Low" | "Moderate" | "High" = "Low";
  if (finalScore > 65) level = "High";
  else if (finalScore > 35) level = "Moderate";

  insights.push(`Rule-based estimate using BMI: ${bmi.toFixed(1)}, Activity: ${input.activityLevel}, Stage: ${input.broadHealthStage}.`);

  return { score: finalScore, level, insights };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userData: any;
}

export default function RiskPredictionCard({ userData }: Props) {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const input = buildInput(userData ?? {});
  const missingData = !input;

  const runPrediction = async (inp: PredictionInput) => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);
    try {
      const API_BASE = (import.meta.env.VITE_ML_API_URL as string | undefined) ?? "http://localhost:5001";
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inp),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result: PredictionResult = await res.json();
      setPrediction(result);

      // Save to Firestore
      const user = auth.currentUser;
      if (user) {
        saveRiskRecord(user.uid, {
          riskLevel: result.riskLevel,
          riskScore: result.riskScore,
          bmi: result.bmi,
          modelUsed: result.modelUsed,
          insights: result.insights,
        }).catch(() => {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Prediction failed";
      // AbortError just means timeout — show friendly message
      setError(err instanceof Error && err.name === "AbortError" ? "Request timed out" : msg);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setHasRun(true);
    }
  };

  // Auto-run when data is available and no cached result
  useEffect(() => {
    if (!userData || hasRun) return;
    const inp = buildInput(userData);
    if (!inp) return; // missing data — don't run
    // Skip if we already have a cached Firestore result AND it's recent (<1 day old)
    const cachedAt = userData?.latestRisk?.updatedAt;
    if (cachedAt) {
      const ageMs = Date.now() - new Date(cachedAt).getTime();
      if (ageMs < 24 * 60 * 60 * 1000) { setHasRun(true); return; } // use cache
    }
    runPrediction(inp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.age, userData?.weightKg, userData?.heightCm]);

  // Determine what values to display
  const fallback = input ? calculateRuleBasedScore(input) : null;

  const riskLevel: "Low" | "Moderate" | "High" =
    prediction?.riskLevel ?? userData?.latestRisk?.riskLevel ?? fallback?.level ?? "Low";
  const riskScore: number =
    prediction?.riskScore ?? userData?.latestRisk?.riskScore ?? fallback?.score ?? 0;
  const bmiVal: number =
    prediction?.bmi ?? userData?.latestRisk?.bmi ?? (input ? input.weightKg / Math.pow(input.heightCm / 100, 2) : 0);
  const insights: string[] =
    prediction?.insights ?? (fallback?.insights ?? []);
  const modelUsed: string =
    prediction?.modelUsed ?? (error ? "Rule-based fallback" : userData?.latestRisk ? "Cached result" : "");

  const cfg = RISK_CONFIG[riskLevel];
  const { Icon } = cfg;

  // SVG ring math
  const RADIUS = 38;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeOffset = ((100 - riskScore) / 100) * CIRCUMFERENCE;

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
            <p className="text-[15px] font-bold text-[#1F2937]">
              {missingData ? "Profile Incomplete" : cfg.label}
            </p>
          </div>
        </div>

        {/* Circular progress ring */}
        <div className="relative w-[84px] h-[84px] shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={RADIUS} fill="none" stroke="#F3F4F6" strokeWidth="8" />
            {!missingData && (
              <circle
                cx="44" cy="44" r={RADIUS}
                fill="none"
                stroke={cfg.ringColor}
                strokeWidth="8"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={loading ? CIRCUMFERENCE : strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : missingData ? (
              <AlertCircle className="w-6 h-6 text-amber-400" />
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

      {/* ── Missing data warning ── */}
      {missingData ? (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
          <p className="text-[13px] font-bold text-amber-700 mb-1">⚠ Complete your health profile</p>
          <p className="text-[12px] text-amber-600 leading-relaxed">
            Add your <strong>Age, Height, and Weight</strong> during onboarding to unlock the AI risk assessment.
            The model needs these to calculate your BMI and predict diabetes & obesity risk.
          </p>
        </div>
      ) : (
        <>
          {/* ── Risk badge + BMI ── */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-bold border ${cfg.badgeClass}`}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </span>
            {bmiVal > 0 && (
              <span className="text-[12px] text-muted-foreground">
                BMI&nbsp;
                <strong className="text-[#1F2937]">{bmiVal.toFixed(1)}</strong>
                &nbsp;
                <span>
                  {bmiVal < 18.5 ? "· Underweight" : bmiVal < 25 ? "· Normal" : bmiVal < 30 ? "· Overweight" : "· Obese"}
                </span>
              </span>
            )}
          </div>

          <p className="text-[13px] text-muted-foreground mb-4">{cfg.summary}</p>

          {/* ── AI Insights ── */}
          {insights.length > 0 && (
            <div className="space-y-2 mb-4">
              {insights.slice(0, 3).map((tip, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-2xl bg-[#F8F9FA]">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: cfg.ringColor }} />
                  <p className="text-[12px] text-[#374151] leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Model used ── */}
          {modelUsed && (
            <p className="text-[10px] text-muted-foreground mb-3 font-medium">
              📊 {modelUsed}
            </p>
          )}

          {/* ── API offline notice ── */}
          {error && (
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-2.5 mb-3">
              ⚠ ML backend offline — showing rule-based estimate.
            </p>
          )}
        </>
      )}

      {/* ── Refresh button ── */}
      {!missingData && (
        <button
          onClick={() => input && runPrediction(input)}
          disabled={loading}
          className="flex items-center gap-1.5 text-[12px] font-bold text-primary hover:opacity-80 disabled:opacity-40 transition-opacity"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analysing…" : "Refresh Assessment"}
        </button>
      )}
    </motion.div>
  );
}
