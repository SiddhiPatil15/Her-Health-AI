import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  TrendingDown, 
  Dumbbell, 
  Apple, 
  Weight, 
  TrendingUp, 
  Sparkles,
  Info,
  Calendar,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

export default function RiskSimulatorView({ userData, setActiveTab }: { userData: any; setActiveTab: (tab: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [weightLoss, setWeightLoss] = useState(3); // kg
  const [exerciseLevel, setExerciseLevel] = useState("moderate");
  const [dietLevel, setDietLevel] = useState("low-sugar");
  const [simData, setSimData] = useState<any>(null);
  
  // Selection tab state
  const [selectedRiskKey, setSelectedRiskKey] = useState<"diabetes" | "obesity" | "gestational" | "metabolic">("diabetes");

  useEffect(() => {
    runSimulation();
  }, [weightLoss, exerciseLevel, dietLevel, userData]);

  const runSimulation = async () => {
    if (!userData) return;
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5001/api/risk-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: userData.age || 30,
          heightCm: userData.heightCm || 165,
          weightKg: userData.weightKg || 65,
          activityLevel: userData.activityLevel || "moderate",
          sleepHours: userData.sleepHours || 7,
          dietType: userData.dietType || "balanced",
          diabetesHistory: userData.diabetesHistory || "no",
          bloodPressure: userData.bloodPressure || "normal",
          weightReductionKg: weightLoss,
          exerciseIncrease: exerciseLevel,
          dietImprovement: dietLevel
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSimData(data);
      } else {
        throw new Error("Simulation endpoint failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not compute lifestyle forecast simulation.");
    } finally {
      setLoading(false);
    }
  };

  if (!userData) return <div className="p-8 text-center">Please finish onboarding first.</div>;

  const selectedRiskData = simData ? simData[selectedRiskKey] : null;

  // Format Recharts data
  const chartData = (() => {
    if (!simData) return [];
    
    if (selectedRiskKey === "metabolic") {
      // Return max of composite risks per timeframe
      return simData.diabetes.statusQuoTimeline.map((item: any, i: number) => {
        const dbSq = simData.diabetes.statusQuoTimeline[i].risk;
        const obSq = simData.obesity.statusQuoTimeline[i].risk;
        const gdSq = simData.gestational ? simData.gestational.statusQuoTimeline[i].risk : 10;

        const dbOpt = simData.diabetes.optimizedTimeline[i].risk;
        const obOpt = simData.obesity.optimizedTimeline[i].risk;
        const gdOpt = simData.gestational ? simData.gestational.optimizedTimeline[i].risk : 10;

        return {
          month: item.month,
          "Status Quo (No Change)": Math.max(dbSq, obSq, gdSq),
          "With Optimized Lifestyle": Math.max(dbOpt, obOpt, gdOpt)
        };
      });
    }

    if (!selectedRiskData || !selectedRiskData.statusQuoTimeline) return [];
    return selectedRiskData.statusQuoTimeline.map((item: any, i: number) => ({
      month: item.month,
      "Status Quo (No Change)": item.risk,
      "With Optimized Lifestyle": selectedRiskData.optimizedTimeline[i].risk
    }));
  })();

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <TrendingDown size={32} className="text-[#FF758C]" /> Future Health Risk Prediction & Simulator
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Simulate the impact of lifestyle modifications on your long-term metabolic health.
          </p>
        </div>
        <button 
          onClick={() => setActiveTab("home")}
          className="px-6 py-2.5 bg-white border border-[#F3F4F6] rounded-full text-[14px] font-bold shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 shrink-0"
        >
          ← Go Back
        </button>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sliders Control Panel */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Simulator Inputs
          </h3>

          {/* Weight loss slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-600">
              <span className="flex items-center gap-1.5"><Weight className="w-4 h-4 text-primary" /> Weight Reduction</span>
              <span className="text-primary font-black">{weightLoss} kg</span>
            </div>
            <input 
              type="range" 
              min={0} max={15} step={1}
              value={weightLoss}
              onChange={e => setWeightLoss(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-gray-400 font-semibold">Simulate weight reduction of up to 15 kg</p>
          </div>

          {/* Exercise increase dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-600 flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-blue-500" /> Physical Exercise Level
            </label>
            <select
              value={exerciseLevel}
              onChange={e => setExerciseLevel(e.target.value)}
              className="w-full bg-[#F3F4F6] border-none p-3.5 rounded-xl font-semibold text-xs outline-none focus:ring-2 focus:ring-primary/20 text-gray-700 cursor-pointer"
            >
              <option value="sedentary">Sedentary (No regular exercise)</option>
              <option value="light">Light Activity (1-2 days/week)</option>
              <option value="moderate">Moderate Exercise (3-4 days/week)</option>
              <option value="very">Active Training (5+ days/week)</option>
            </select>
          </div>

          {/* Diet Improvement */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-600 flex items-center gap-1.5">
              <Apple className="w-4 h-4 text-emerald-500" /> Dietary Adjustments
            </label>
            <select
              value={dietLevel}
              onChange={e => setDietLevel(e.target.value)}
              className="w-full bg-[#F3F4F6] border-none p-3.5 rounded-xl font-semibold text-xs outline-none focus:ring-2 focus:ring-primary/20 text-gray-700 cursor-pointer"
            >
              <option value="none">No Dietary Changes</option>
              <option value="low-sugar">Low-Sugar & Low-Glycemic Focus</option>
              <option value="healthy">High Fiber & Mediterranean Diet</option>
            </select>
          </div>

          {/* Warning banner */}
          <div className="bg-rose-50 border border-rose-100 rounded-[20px] p-4 flex gap-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-primary mt-0.5" />
            <p className="leading-relaxed font-semibold">
              These projections are calculated using Random Forest models trained on patient data and represent simulated paths based on standard metabolic coefficients.
            </p>
          </div>
        </div>

        {/* Projections & Charts */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tabs for Risk Categorization */}
          <div className="flex flex-wrap gap-2 border-b border-gray-150 pb-4">
            {[
              { key: "diabetes", label: "Diabetes Risk" },
              { key: "obesity", label: "Obesity Risk" },
              { key: "gestational", label: "Gestational Diabetes", hide: userData.broadHealthStage !== "pregnancy" },
              { key: "metabolic", label: "Metabolic Status" }
            ].map(tab => (
              tab.hide ? null : (
                <button
                  key={tab.key}
                  onClick={() => setSelectedRiskKey(tab.key as any)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    selectedRiskKey === tab.key 
                      ? "bg-primary text-white shadow-md shadow-rose-100" 
                      : "bg-white text-gray-500 hover:bg-gray-55 border border-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              )
            ))}
          </div>

          {/* Simulator Outcomes Overview Banner */}
          {simData && selectedRiskData && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-[24px] p-6 border border-emerald-100 flex items-center justify-between gap-6">
              <div className="space-y-1">
                <h4 className="text-md font-bold text-emerald-900 capitalize">{selectedRiskKey} Risk Projections</h4>
                <p className="text-xs text-emerald-700 font-semibold leading-relaxed max-w-lg">
                  Applying these simulated changes reduces your risk probability from <strong className="text-rose-500">{selectedRiskData.currentRisk}%</strong> to <strong className="text-emerald-600">{selectedRiskData.predictedRisk}%</strong> in 12 months.
                </p>
              </div>
              <div className="text-center bg-white px-5 py-3.5 rounded-2xl shadow-sm border border-emerald-200 shrink-0">
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Improvement</p>
                <p className="text-2xl font-black text-emerald-600 mt-0.5">+{selectedRiskData.improvementPercentage}%</p>
              </div>
            </div>
          )}

          {/* Timeline chart */}
          <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Risk Projection Timeline (12 Months)
            </h3>
            {loading ? (
              <div className="h-72 flex items-center justify-center font-semibold text-muted-foreground">Calculating trajectories...</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} fontWeight="bold" tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={11} fontWeight="bold" tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <Line type="monotone" name="Status Quo (No Change)" dataKey="Status Quo (No Change)" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" name="With Optimized Lifestyle" dataKey="With Optimized Lifestyle" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
