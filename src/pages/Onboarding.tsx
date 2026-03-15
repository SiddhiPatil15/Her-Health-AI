import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { auth, db } from "../lib/firebase";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Activity, Brain, Heart, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard if onboarding is already completed
  useEffect(() => {
    if (auth.currentUser) {
      const checkOnboarding = async () => {
        const userRef = doc(db, "users", auth.currentUser!.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().onboardingCompleted) {
          navigate("/dashboard");
        }
      };
      checkOnboarding();
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    broadHealthStage: "", // Pregnancy or Menopause
    age: "",
    heightCm: "",
    weightKg: "",
    activityLevel: "moderate",
    sleepHours: "7",
    dietType: "balanced",
    currentStage: "", // e.g., 2nd Trimester, Post-menopausal
    diabetesHistory: "no",
    bloodPressure: "normal",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleComplete = async () => {
    if (!auth.currentUser) {
      console.log("Onboarding: No current user");
      return;
    }
    setLoading(true);
    console.log("Onboarding: Starting profile save", formData);

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userRef, {
        ...formData,
        age: Number(formData.age),
        heightCm: Number(formData.heightCm),
        weightKg: Number(formData.weightKg),
        sleepHours: Number(formData.sleepHours),
        onboardingCompleted: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      console.log("Onboarding: Profile saved successfully");
      toast.success("Profile completed! Welcome to your dashboard.");
      
      // Delay slightly to ensure Firestore is updated before navigation
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error: any) {
      console.error("Onboarding: Error saving profile", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const prevStep = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <nav className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center bg-background/80 backdrop-blur-sm z-50 max-w-[1280px] mx-auto">
         <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-caption">H</div>
          <span className="text-body font-semibold text-foreground">HerHealth</span>
        </div>
        <button onClick={() => signOut(auth)} className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-body">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </nav>

      <div className="max-w-xl mx-auto pt-12">
        <div className="mb-12 text-center">
          <h2 className="text-h1 font-bold text-foreground mb-2">Welcome, {auth.currentUser?.displayName?.split(' ')[0]}</h2>
          <p className="text-body text-muted-foreground">Tailoring your experience based on your health profile</p>
          
          <div className="flex justify-between mt-8 relative px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold z-10 ${step >= i ? 'gradient-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-border'}`}>
                {i}
              </div>
            ))}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2"></div>
            <div className={`absolute top-1/2 left-0 h-0.5 gradient-primary -translate-y-1/2 transition-all duration-300`} style={{ width: `${(step - 1) * 50}%` }}></div>
          </div>
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card p-8 rounded-3xl border border-border shadow-xl cursor-default"
        >
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-h2 font-bold mb-4">Core Health Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-caption font-medium">Age</label>
                  <input name="age" type="number" value={formData.age} onChange={handleChange} className="w-full p-3 rounded-xl bg-background border border-border" placeholder="28" />
                </div>
                <div className="space-y-2">
                  <label className="text-caption font-medium">Current Stage</label>
                  <select name="broadHealthStage" value={formData.broadHealthStage} onChange={handleChange} className="w-full p-3 rounded-xl bg-background border border-border">
                    <option value="">Select Stage</option>
                    <option value="pregnancy">Pregnancy</option>
                    <option value="menopause">Menopause</option>
                    <option value="general">General Wellness</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-caption font-medium">Height (cm)</label>
                  <input name="heightCm" type="number" value={formData.heightCm} onChange={handleChange} className="w-full p-3 rounded-xl bg-background border border-border" placeholder="165" />
                </div>
                <div className="space-y-2">
                  <label className="text-caption font-medium">Weight (kg)</label>
                  <input name="weightKg" type="number" value={formData.weightKg} onChange={handleChange} className="w-full p-3 rounded-xl bg-background border border-border" placeholder="62" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-h2 font-bold mb-4">Lifestyle & Habits</h3>
              <div className="space-y-2">
                <label className="text-caption font-medium">Activity Level</label>
                <select name="activityLevel" value={formData.activityLevel} onChange={handleChange} className="w-full p-3 rounded-xl bg-background border border-border">
                  <option value="sedentary">Sedentary (Little to no exercise)</option>
                  <option value="light">Lightly Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="very">Very Active</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-caption font-medium">Sleep (Hours/Night)</label>
                  <input name="sleepHours" type="number" value={formData.sleepHours} onChange={handleChange} className="w-full p-3 rounded-xl bg-background border border-border" />
                </div>
                <div className="space-y-2">
                  <label className="text-caption font-medium">Diet Preference</label>
                  <select name="dietType" value={formData.dietType} onChange={handleChange} className="w-full p-3 rounded-xl bg-background border border-border">
                    <option value="balanced">Balanced</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="keto">Keto</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-h2 font-bold mb-4">Medical History</h3>
              <div className="space-y-2">
                <label className="text-caption font-medium">Current Status (Trimester / Phase)</label>
                <input name="currentStage" type="text" value={formData.currentStage} onChange={handleChange} placeholder="e.g. 2nd Trimester, Perimenopausal" className="w-full p-3 rounded-xl bg-background border border-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <label className="text-caption font-medium">Diabetes History</label>
                  <select name="diabetesHistory" value={formData.diabetesHistory} onChange={handleChange} className="w-full p-3 rounded-xl bg-background border border-border">
                    <option value="no">No</option>
                    <option value="family">Family History</option>
                    <option value="gestational">Past Gestational</option>
                    <option value="type2">Type 2</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-caption font-medium">Blood Pressure</label>
                  <select name="bloodPressure" value={formData.bloodPressure} onChange={handleChange} className="w-full p-3 rounded-xl bg-background border border-border">
                    <option value="normal">Normal</option>
                    <option value="high">High (Hypertension)</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-12">
            {step > 1 && (
              <button onClick={prevStep} className="flex-1 py-3 text-foreground font-medium rounded-xl border border-border hover:bg-muted">
                Back
              </button>
            )}
            {step < 3 ? (
              <button onClick={nextStep} className="flex-1 py-3 gradient-primary text-primary-foreground font-bold rounded-xl hover-lift">
                Next
              </button>
            ) : (
              <button onClick={handleComplete} disabled={loading} className="flex-1 py-3 gradient-primary text-primary-foreground font-bold rounded-xl hover-lift disabled:opacity-50">
                {loading ? "Saving Profile..." : "Complete Profile"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
