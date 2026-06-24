import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { saveFoodLog, getFoodLogs, FoodLog } from "@/lib/healthService";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/api";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Flame, 
  Apple, 
  History, 
  ArrowRight,
  TrendingUp,
  X,
  PieChart as PieIcon
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";

export default function FoodScannerView({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [history, setHistory] = useState<FoodLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const logs = await getFoodLogs(user.uid, 20);
      setHistory(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setScanResult(null);
    };
    reader.readAsDataURL(file);
  };

  const triggerScan = async () => {
    if (!image) return;
    setScanning(true);
    try {
      const response = await fetch(`${API_BASE}/api/scan-food`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image })
      });

      if (response.ok) {
        const result = await response.json();
        setScanResult(result);
        
        // Log to database automatically
        const user = auth.currentUser;
        if (user) {
          const logData: Omit<FoodLog, "createdAt"> = {
            date: new Date().toISOString().split("T")[0],
            mealType: "lunch", // default classification
            foodItems: result.foodItems,
            calories: result.calories,
            protein: result.protein,
            carbs: result.carbs,
            fat: result.fat,
            sugar: result.sugar,
            scanned: true
          };
          await saveFoodLog(user.uid, logData);
          fetchHistory();
          toast.success("Meal analyzed and logged to history!");
        }
      } else {
        throw new Error("Failed to scan food image.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Computer Vision scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  // Format daily nutritional trends
  const trendsData = (() => {
    const daily: Record<string, { calories: number; protein: number; carbs: number; fat: number; sugar: number }> = {};
    history.forEach(log => {
      const date = log.date;
      if (!daily[date]) {
        daily[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 };
      }
      daily[date].calories += log.calories;
      daily[date].protein += log.protein;
      daily[date].carbs += log.carbs;
      daily[date].fat += log.fat;
      daily[date].sugar += log.sugar;
    });

    return Object.entries(daily)
      .map(([date, vals]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        rawDate: date,
        ...vals
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .slice(-7); // show last 7 active days
  })();

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Camera size={32} className="text-primary" /> Food Image Scanner (AI Vision)
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Upload an image of your plate to instantly extract calories, macros, and get healthy alternatives.
          </p>
        </div>
        <button 
          onClick={() => setActiveTab("home")}
          className="px-6 py-2.5 bg-white border border-[#F3F4F6] rounded-full text-[14px] font-bold shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 shrink-0"
        >
          ← Go Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Upload & Webcam box */}
        <div className="lg:col-span-6 bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm flex flex-col justify-between min-h-[350px] relative">
          
          {image ? (
            <div className="w-full flex-1 flex flex-col items-center justify-center relative rounded-2xl overflow-hidden min-h-[220px]">
              <img src={image} className="max-h-[260px] object-contain rounded-2xl" alt="Food preview" />
              <button 
                onClick={() => { setImage(null); setScanResult(null); }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label className="w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-primary rounded-[24px] cursor-pointer transition p-8 space-y-4">
              <Upload className="w-12 h-12 text-gray-300" />
              <div className="text-center">
                <span className="text-sm font-bold text-gray-700">Drag & drop plate photo here</span>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG formats up to 5MB</p>
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}

          <div className="w-full pt-6 border-t border-gray-50 mt-6 flex gap-3">
            <button
              onClick={triggerScan}
              disabled={!image || scanning}
              className="flex-1 py-4 bg-primary hover:bg-rose-500 text-white font-bold rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  AI Analyzing Plate...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Analyze Plate Calories & Macros
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Card */}
        <div className="lg:col-span-6 bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm flex flex-col justify-center min-h-[350px]">
          <AnimatePresence mode="wait">
            {scanResult ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {/* Calories & Health Score Banner */}
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center"><Flame size={20} /></div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Estimated Energy</p>
                      <p className="text-lg font-bold text-gray-800">{scanResult.calories} kcal</p>
                    </div>
                  </div>
                  <div className="text-center bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl">
                    <p className="text-[9px] text-emerald-600 font-bold uppercase">Food Score</p>
                    <p className="text-md font-black text-emerald-600 mt-0.5">{scanResult.healthScore}/100</p>
                  </div>
                </div>

                {/* Macro breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detected Food & Macros</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {scanResult.foodItems.map((item: string, idx: number) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-xl font-semibold">{item}</span>
                    ))}
                  </div>

                  <div className="flex items-center gap-8 justify-around bg-gray-50 p-4 rounded-2xl">
                    <div className="text-center"><p className="text-xs text-blue-500 font-black">{scanResult.carbs}g</p><p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Carbs</p></div>
                    <div className="text-center"><p className="text-xs text-emerald-600 font-black">{scanResult.protein}g</p><p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Protein</p></div>
                    <div className="text-center"><p className="text-xs text-rose-500 font-black">{scanResult.fat}g</p><p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Fat</p></div>
                    <div className="text-center"><p className="text-xs text-purple-500 font-black">{scanResult.sugar}g</p><p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Sugar</p></div>
                  </div>
                </div>

                {/* Portion advice & Alternatives */}
                <div className="space-y-4 pt-4 border-t border-gray-100 text-xs font-semibold text-gray-600">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Portion Recommendation</p>
                    <p className="text-gray-700 font-medium leading-relaxed">{scanResult.portionRecommendation}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Healthier Alternatives</p>
                    <ul className="list-disc pl-4 space-y-1.5 text-gray-700 font-medium">
                      {scanResult.healthierAlternatives.map((alt: string, i: number) => (
                        <li key={i}>{alt}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-8 text-gray-400 space-y-2">
                <PieIcon className="w-10 h-10 mx-auto text-gray-250 animate-bounce" />
                <p className="font-bold text-sm">Upload a photo to see nutrition analysis</p>
                <p className="text-xs max-w-xs mx-auto leading-relaxed">
                  Our Computer Vision model will check calories, protein, sugar levels, and suggest clinical dietary adjustments.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nutritional Trends Section */}
      {trendsData.length > 0 && (
        <section className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Daily Nutritional Trends (Last 7 Active Days)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData}>
                <defs>
                  <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} fontWeight="bold" tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} fontWeight="bold" tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                <Area type="monotone" name="Calories (kcal)" dataKey="calories" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCalories)" />
                <Area type="monotone" name="Sugar (g)" dataKey="sugar" stroke="#8B5CF6" strokeWidth={2} fill="transparent" />
                <Area type="monotone" name="Protein (g)" dataKey="protein" stroke="#3B82F6" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* History Log */}
      <section className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-400" /> Plate Analysis History
        </h3>
        {loadingHistory ? (
          <p className="text-center py-6 text-xs text-gray-400">Loading meal records...</p>
        ) : history.length === 0 ? (
          <p className="text-center py-6 text-xs text-gray-400 font-bold">No meal history logged yet. Scan a food image to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-gray-600 border-collapse">
              <thead>
                <tr className="border-b border-gray-100 pb-3 text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Meal Items</th>
                  <th className="pb-3 text-right">Calories</th>
                  <th className="pb-3 text-right">Protein</th>
                  <th className="pb-3 text-right">Carbs</th>
                  <th className="pb-3 text-right">Fat</th>
                  <th className="pb-3 text-right">Sugar</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id || i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 font-bold text-gray-800">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="py-4 text-gray-700 leading-normal max-w-xs truncate">{h.foodItems.join(", ")}</td>
                    <td className="py-4 text-right text-orange-500 font-bold">{h.calories} kcal</td>
                    <td className="py-4 text-right text-emerald-600 font-bold">{h.protein}g</td>
                    <td className="py-4 text-right text-blue-500 font-bold">{h.carbs}g</td>
                    <td className="py-4 text-right text-rose-500 font-bold">{h.fat}g</td>
                    <td className="py-4 text-right text-purple-500 font-bold">{h.sugar}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
