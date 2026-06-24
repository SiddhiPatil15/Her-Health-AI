import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/api";
import { 
  Sparkles, 
  Flame, 
  Dumbbell, 
  Apple, 
  Droplet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle,
  RefreshCw,
  Heart
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function DietPlannerView({ userData, setActiveTab }: { userData: any; setActiveTab: (tab: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [cycleStage, setCycleStage] = useState("follicular");
  const [dietPlan, setDietPlan] = useState<any>(null);

  useEffect(() => {
    fetchDietPlan();
  }, [cycleStage, userData]);

  const fetchDietPlan = async () => {
    if (!userData) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/diet-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: userData.age || 30,
          heightCm: userData.heightCm || 165,
          weightKg: userData.weightKg || 65,
          activityLevel: userData.activityLevel || "moderate",
          broadHealthStage: userData.broadHealthStage || "general",
          dietType: userData.dietType || "balanced",
          cycleStage: cycleStage,
          diabetesRiskScore: userData.latestRisk?.riskScore || 30,
          obesityRiskScore: Math.max(10, Math.round((userData.latestRisk?.riskScore || 30) * 0.95))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDietPlan(data);
      } else {
        throw new Error("Failed to load diet recommendations.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not retrieve diet plan.");
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="p-8 text-center text-muted-foreground font-semibold">
        Please complete your onboarding profile to generate a diet plan.
      </div>
    );
  }

  const userBmi = userData.weightKg && userData.heightCm 
    ? (userData.weightKg / Math.pow(userData.heightCm / 100, 2)).toFixed(1)
    : "22.0";

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Apple size={32} className="text-emerald-500" /> AI Personalized Nutrition Planner
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Optimized for {userData.broadHealthStage || "General"} stage • Diet preference: {userData.dietType || "Balanced"}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Cycle Phase select */}
          <div className="flex items-center gap-2 bg-[#E6F4EA] px-4 py-2 rounded-2xl border border-emerald-100 flex-1 md:flex-none">
            <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider hidden lg:inline">Cycle Stage:</span>
            <select
              value={cycleStage}
              onChange={e => setCycleStage(e.target.value)}
              className="bg-transparent border-none text-emerald-800 font-bold text-xs outline-none cursor-pointer w-full"
            >
              <option value="menstrual">Menstrual Phase 🩸</option>
              <option value="follicular">Follicular Phase 🌱</option>
              <option value="ovulation">Ovulation Phase 🥚</option>
              <option value="luteal">Luteal Phase 🍂</option>
            </select>
          </div>
          <button 
            onClick={() => setActiveTab("home")}
            className="px-6 py-2.5 bg-white border border-[#F3F4F6] rounded-full text-[14px] font-bold shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 shrink-0"
          >
            ← Go Back
          </button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">Formulating your personalized meal plan...</p>
        </div>
      ) : dietPlan ? (
        <div className="space-y-8">
          {/* Inputs Summary panel */}
          <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Input Profile Parameters Used</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-semibold text-gray-655">
              <div className="bg-gray-50 p-3 rounded-2xl">
                <span className="text-gray-450 block mb-0.5 text-[10px] uppercase font-bold">Demographics</span>
                <span className="text-gray-800 font-bold">{userData.age || 30} yrs | {userData.heightCm || 165} cm | {userData.weightKg || 65} kg</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl">
                <span className="text-gray-455 block mb-0.5 text-[10px] uppercase font-bold">BMI & Status</span>
                <span className="text-gray-800 font-bold">{userBmi} ({Number(userBmi) >= 25 ? "Overweight" : "Normal"})</span>
              </div>
              <div className="bg-gray-55 p-3 rounded-2xl">
                <span className="text-gray-460 block mb-0.5 text-[10px] uppercase font-bold">Activity & Stage</span>
                <span className="text-gray-800 font-bold capitalize">{userData.activityLevel} | {userData.broadHealthStage || "general"}</span>
              </div>
              <div className="bg-gray-60 p-3 rounded-2xl">
                <span className="text-gray-465 block mb-0.5 text-[10px] uppercase font-bold">Cycle Phase</span>
                <span className="text-gray-800 font-bold capitalize">{cycleStage} stage</span>
              </div>
              <div className="bg-gray-65 p-3 rounded-2xl">
                <span className="text-gray-470 block mb-0.5 text-[10px] uppercase font-bold">Risk Scores</span>
                <span className="text-rose-500 font-bold">DB: {userData.latestRisk?.riskScore || 30}% | OB: {Math.max(10, Math.round((userData.latestRisk?.riskScore || 30) * 0.95))}%</span>
              </div>
            </div>
          </div>

          {/* AI Banner for menstrual adjustment */}
          <div className="bg-[#E6F4EA] rounded-[24px] p-6 border border-emerald-100 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-md font-bold text-emerald-950">AI Nutrition Recommendation</h3>
              <p className="text-sm text-emerald-800 mt-1 leading-relaxed font-semibold">
                {dietPlan.cycleRecommendation}
              </p>
            </div>
          </div>

          {/* Calorie & Macros Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Calories Card */}
            <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 shadow-sm relative">
                <Flame size={24} />
              </div>
              <div className="relative">
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Calorie Target</p>
                <p className="text-2xl font-bold text-gray-800 mt-0.5">{dietPlan.targetCalories} kcal</p>
              </div>
            </div>

            {/* Protein */}
            <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Protein</span>
                <span className="text-xs font-bold text-gray-800">{dietPlan.macros.protein}g</span>
              </div>
              <Progress value={85} className="bg-gray-100 h-2.5 rounded-full" />
              <p className="text-[10px] text-gray-400 font-semibold">{dietPlan.macros.protein * 4} kcal • Lean meats, soy, fish</p>
            </div>

            {/* Carbs */}
            <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Carbohydrates</span>
                <span className="text-xs font-bold text-gray-800">{dietPlan.macros.carbs}g</span>
              </div>
              <Progress value={60} className="bg-gray-100 h-2.5 rounded-full" />
              <p className="text-[10px] text-gray-400 font-semibold">{dietPlan.macros.carbs * 4} kcal • Complex carbs, fiber</p>
            </div>

            {/* Fat */}
            <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Fat</span>
                <span className="text-xs font-bold text-gray-800">{dietPlan.macros.fat}g</span>
              </div>
              <Progress value={45} className="bg-gray-100 h-2.5 rounded-full" />
              <p className="text-[10px] text-gray-400 font-semibold">{dietPlan.macros.fat * 9} kcal • Avocado, olive oil, nuts</p>
            </div>
          </div>

          {/* Daily Meals (Breakfast, Lunch, Dinner, Snacks) */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="text-emerald-500" size={20} /> Daily Meal Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MealCard title="Breakfast" name={dietPlan.plan.meals.breakfast.name} details={dietPlan.plan.meals.breakfast.details} time="08:00 AM" />
              <MealCard title="Lunch" name={dietPlan.plan.meals.lunch.name} details={dietPlan.plan.meals.lunch.details} time="01:00 PM" />
              <MealCard title="Dinner" name={dietPlan.plan.meals.dinner.name} details={dietPlan.plan.meals.dinner.details} time="07:30 PM" />
              <MealCard title="Snacks" name={dietPlan.plan.meals.snacks.name} details={dietPlan.plan.meals.snacks.details} time="04:30 PM" />
            </div>
          </div>

          {/* Focus foods, Avoid foods & lifestyle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Foods to Focus On */}
            <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
              <h4 className="font-bold text-emerald-800 text-sm mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Foods to Focus On
              </h4>
              <ul className="space-y-3 text-xs font-semibold text-gray-600">
                {dietPlan.plan.foodsToIncrease.map((food: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>{food}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Foods to Avoid */}
            <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
              <h4 className="font-bold text-rose-800 text-sm mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" /> Foods to Avoid
              </h4>
              <ul className="space-y-3 text-xs font-semibold text-gray-600">
                {dietPlan.plan.foodsToAvoid.map((food: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                    <span>{food}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Lifestyle & Hydration */}
            <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-blue-800 text-sm mb-4 flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-blue-500 animate-pulse" /> Hydration & Lifestyle
                </h4>
                <ul className="space-y-3 text-xs font-semibold text-gray-600">
                  {dietPlan.plan.lifestyleTips.map((tip: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-50 flex justify-between items-center text-xs">
                <span className="font-bold text-gray-400">Metabolic Status:</span>
                <span className={`font-bold uppercase px-2.5 py-1 rounded-full text-[10px] ${
                  userData.latestRisk?.riskLevel === "High" 
                    ? "bg-rose-50 text-rose-500" 
                    : userData.latestRisk?.riskLevel === "Moderate"
                    ? "bg-amber-50 text-amber-500"
                    : "bg-emerald-50 text-emerald-500"
                }`}>
                  {userData.latestRisk?.riskLevel || "Low"} Risk
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-rose-500 font-bold bg-rose-50 border border-rose-100 rounded-3xl">
          An error occurred. We could not generate your diet recommendations. Please try refreshing.
        </div>
      )}
    </div>
  );
}

function MealCard({ title, name, details, time }: { title: string; name: string; details: string; time: string }) {
  return (
    <div className="bg-white p-5 rounded-[24px] border border-[#F3F4F6] shadow-sm hover:shadow-md transition flex flex-col justify-between h-[210px]">
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">{title}</span>
          <span className="text-[10px] font-bold text-gray-400">{time}</span>
        </div>
        <h4 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2 mb-1.5">{name}</h4>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{details}</p>
      </div>
    </div>
  );
}
