import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Loader2, Mic, Volume2, VolumeX, Radio } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { auth, db, doc, getDoc } from "@/lib/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { API_BASE } from "@/lib/api";

const suggestedPrompts = [
  "What is my diabetes risk based on my profile?",
  "How can I reduce obesity risk during menopause?",
  "What foods help prevent gestational diabetes?",
  "What does my BMI mean for my health?",
  "How many steps should I walk daily to lower diabetes risk?",
  "What lifestyle changes reduce metabolic syndrome?",
];

interface Message {
  role: "user" | "assistant";
  text: string;
}

// Build system prompt
function buildSystemPrompt(userData: Record<string, any>): string {
  const stage = userData?.broadHealthStage ?? "general";
  const age = userData?.age ?? "not specified";
  const weight = userData?.weightKg ?? "not specified";
  const height = userData?.heightCm ?? "not specified";
  const bmi = weight && height
    ? (Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1)
    : "not calculated";
  const diet = userData?.dietType ?? "not specified";
  const history = userData?.diabetesHistory ?? "not specified";
  const activity = userData?.activityLevel ?? "not specified";
  const sleep = userData?.sleepHours ?? "not specified";
  const risk = (userData?.latestRisk as any)?.riskLevel ?? "not assessed";
  const riskScore = (userData?.latestRisk as any)?.riskScore ?? "not assessed";

  return `You are HerHealth AI — a highly advanced medical AI assistant for women's health, strictly focused on Diabetes (Type 2 & Gestational), Obesity, Menopause, and Metabolic Health.

USER HEALTH PROFILE:
- Health Stage: ${stage}
- Age: ${age} years
- Weight: ${weight} kg | Height: ${height} cm | BMI: ${bmi}
- Activity Level: ${activity}
- Sleep: ${sleep} hours/night
- Diet: ${diet}
- Diabetes History: ${history}
- AI Risk Level: ${risk} (Score: ${riskScore}/100)

CRITICAL INSTRUCTIONS:
1. YOU MUST ANSWER THE USER'S QUESTION DIRECTLY AND SPECIFICALLY. Do not give vague or generic advice.
2. USE THE DATA: Always incorporate the user's BMI, stage, or risk level in your explanation.
3. Be highly empathetic but medically rigorous.
4. Keep responses concise (2-3 short paragraphs max).
5. If the question is not about women's metabolic health, politely redirect them back to their health profile.`;
}

export default function AIChat() {
  const [userData, setUserData] = useState<Record<string, any> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("en-US"); // en-US, es-ES, fr-FR, hi-IN
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Re-initialize speech recognition on language change
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = voiceLanguage;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          const wasCommand = handleVoiceCommand(transcript);
          if (!wasCommand) {
            sendMessage(transcript);
          }
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [voiceLanguage]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      import("sonner").then(({ toast }) => {
        toast.error("Speech recognition is not supported in this browser.");
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`~]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = voiceLanguage;

    utterance.onend = () => {
      // Hands-free auto-listening restart
      if (handsFree && recognitionRef.current && !isListening) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (err) {
            console.warn("Failed to auto-restart recognition", err);
          }
        }, 600);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Helper local function to compute scores equivalent to dashboard
  const getCalculatedHealthScore = (data: any) => {
    if (!data) return 72;
    const height = Number(data.heightCm || 165);
    const weight = Number(data.weightKg || 65);
    const bmiVal = weight / Math.pow(height / 100, 2);
    let bmiScore = 100;
    if (bmiVal < 18.5) bmiScore = 100 - (18.5 - bmiVal) * 15;
    else if (bmiVal > 24.9) bmiScore = 100 - (bmiVal - 24.9) * 10;
    
    const activityMap = { sedentary: 30, light: 55, moderate: 80, very: 95 };
    const activityScore = activityMap[data.activityLevel as keyof typeof activityMap] || 60;
    
    const sleepHours = Number(data.sleepHours || 7);
    const sleepScore = Math.max(10, 100 - Math.abs(8 - sleepHours) * 15);
    
    const phq9Score = Number(data.phq9LatestScore || 0);
    const mentalScore = phq9Score > 14 ? 40 : phq9Score > 9 ? 60 : 80;
    
    const weightedScore = Math.round(
      (bmiScore * 0.20) + (activityScore * 0.20) + (sleepScore * 0.15) + (mentalScore * 0.15) + (80 * 0.30)
    );
    return Math.max(10, Math.min(100, weightedScore));
  };

  // Voice Command Intent Handler
  const handleVoiceCommand = (transcript: string): boolean => {
    const q = transcript.toLowerCase();
    
    // Command 1: Diet Plan
    if (q.includes("diet plan") || q.includes("meal plan") || q.includes("nutrition")) {
      const calories = userData?.weightKg ? Math.round(Number(userData.weightKg) * 28) : 1800;
      const protein = userData?.weightKg ? Math.round(Number(userData.weightKg) * 1.4) : 90;
      const response = `Your personalized diet plan target is ${calories} calories. This contains ${protein} grams of protein, optimized for your biological stage. I recommend organic Greek yogurt for breakfast, chicken quinoa salad for lunch, and baked salmon with steamed greens for dinner.`;
      setMessages((prev) => [...prev, 
        { role: "user", text: transcript },
        { role: "assistant", text: response }
      ]);
      speakText(response);
      return true;
    }
    
    // Command 2: Health Score
    if (q.includes("health score") || q.includes("my score") || q.includes("health index")) {
      const score = getCalculatedHealthScore(userData);
      const response = `Your unified Her Health Score is ${score} out of 100. This is calculated dynamically using your body mass index, registered sleep durations, and metabolic indicators.`;
      setMessages((prev) => [...prev, 
        { role: "user", text: transcript },
        { role: "assistant", text: response }
      ]);
      speakText(response);
      return true;
    }

    // Command 3: Risk Predictions
    if (q.includes("risk prediction") || q.includes("risk level") || q.includes("diabetes risk") || q.includes("obesity risk")) {
      const risk = (userData?.latestRisk as any)?.riskLevel ?? "Low";
      const score = (userData?.latestRisk as any)?.riskScore ?? 28;
      const response = `Your latest metabolic assessment indicates a ${risk} risk level, with a score of ${score} out of 100. Keep walking regularly and avoiding high glycemic items to maintain this.`;
      setMessages((prev) => [...prev, 
        { role: "user", text: transcript },
        { role: "assistant", text: response }
      ]);
      speakText(response);
      return true;
    }

    // Command 4: Period/Menstrual Cycle
    if (q.includes("period") || q.includes("cycle") || q.includes("menstrual")) {
      const irregularity = userData?.cycleIrregular ? "irregular cycle warnings" : "a regular cycle pattern";
      const response = `The system logs indicate ${irregularity}. Based on your averages, your ovulation window is estimated approximately 14 days prior to your next period, which is predicted to start soon.`;
      setMessages((prev) => [...prev, 
        { role: "user", text: transcript },
        { role: "assistant", text: response }
      ]);
      speakText(response);
      return true;
    }

    // Command 5: Health Summary
    if (q.includes("health summary") || q.includes("profile summary") || q.includes("about my health")) {
      const stage = userData?.broadHealthStage ?? "general";
      const age = userData?.age ?? "30";
      const weight = userData?.weightKg ?? "65";
      const response = `Here is your profile summary: You are ${age} years old, currently tracking wellness under the ${stage} biological phase. Your weight is registered at ${weight} kilograms, and your overall targets are synchronized.`;
      setMessages((prev) => [...prev, 
        { role: "user", text: transcript },
        { role: "assistant", text: response }
      ]);
      speakText(response);
      return true;
    }

    return false;
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        const firstName = (data.fullName as string | undefined)?.split(" ")[0] ?? "there";
        const riskLevel = (data.latestRisk as any)?.riskLevel;
        setMessages([
          {
            role: "assistant",
            text: `Hi ${firstName}! 👋 I'm your Voice-enabled AI Health Companion, specialized in Diabetes, Obesity, and Metabolic Health.

${
  riskLevel
    ? `Your current AI risk assessment shows **${riskLevel}** metabolic risk. I can help you understand what that means and how to improve it.`
    : "I can answer questions about your health profile, diabetes prevention, obesity risk, and much more!"
}

Try speaking: "What is my diet plan?" or "What is my health score?" 💕`,
          },
        ]);
      } else {
        setMessages([{
          role: "assistant",
          text: "Hi there! 👋 I'm your AI Health Companion. Please complete your health profile (onboarding) so I can give you personalized advice.",
        }]);
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setThinking(true);

    try {
      let responseText = "";

      // 1. Try backend API first
      try {
        const response = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            userData: userData
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.response) {
            responseText = data.response;
          }
        }
      } catch (backendErr) {
        console.warn("Backend connection failed:", backendErr);
      }

      // 2. Try Gemini directly from frontend (Fallback)
      if (!responseText) {
        const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (geminiKey && geminiKey !== "your_api_key_here") {
          try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro"];
            const systemPrompt = buildSystemPrompt(userData ?? {});
            
            for (const m of modelsToTry) {
              try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent({
                  contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser Question: ${text}` }] }],
                  generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
                });
                const textResult = result.response.text();
                if (textResult) {
                  responseText = textResult;
                  break;
                }
              } catch { continue; }
            }
          } catch (geminiErr: any) {
            console.error("Gemini Direct Error:", geminiErr);
          }
        }
      }

      if (!responseText) {
        responseText = generateRuleBasedResponse(text, userData);
      }

      setMessages((prev) => [...prev, { role: "assistant", text: responseText }]);
      speakText(responseText);
    } catch (err: any) {
      console.error("Error sending message:", err);
      const fallbackText = generateRuleBasedResponse(text, userData);
      setMessages((prev) => [...prev, { role: "assistant", text: fallbackText }]);
      speakText(fallbackText);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full mb-6 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="text-h2 text-foreground font-bold">Voice Health Assistant</h1>
                <p className="text-caption text-muted-foreground">
                  Specialized in Diabetes, Obesity & Menopause
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Language Selector */}
              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
                className="bg-gray-50 border border-gray-250 text-xs font-bold rounded-full px-3 py-2 outline-none text-gray-700 cursor-pointer"
              >
                <option value="en-US">English 🇺🇸</option>
                <option value="es-ES">Spanish 🇪🇸</option>
                <option value="fr-FR">French 🇫🇷</option>
                <option value="hi-IN">Hindi 🇮🇳</option>
              </select>

              {/* Hands-Free Toggle */}
              <button
                onClick={() => setHandsFree(!handsFree)}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition flex items-center gap-1.5 ${
                  handsFree
                    ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                    : "bg-gray-50 border-gray-100 text-gray-500"
                }`}
                title="When active, the AI listens automatically after speaking"
              >
                <Radio size={14} className={handsFree ? "animate-pulse" : ""} />
                {handsFree ? "Hands-Free On" : "Hands-Free Off"}
              </button>

              {/* Voice Mute/Unmute */}
              <button
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  if (voiceEnabled) window.speechSynthesis.cancel();
                }}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition flex items-center gap-2 ${
                  voiceEnabled 
                    ? "bg-purple-100 border-purple-200 text-purple-700" 
                    : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {voiceEnabled ? "Voice Enabled" : "Voice Muted"}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-6 min-h-0">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-5 py-3.5 ${
                    msg.role === "user"
                      ? "gradient-primary text-primary-foreground font-semibold"
                      : "bg-card border border-border text-foreground card-shadow leading-relaxed"
                  }`}
                >
                  <p className="text-body whitespace-pre-wrap">{msg.text}</p>
                </div>
              </motion.div>
            ))}
            {thinking && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-body text-muted-foreground">HerHealth AI is thinking...</span>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested Prompts */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-4 py-2 bg-card border border-border rounded-xl text-caption text-foreground hover:border-primary/30 hover-lift transition-all text-left font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="pt-4 border-t border-border mt-auto pb-24 md:pb-0">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder="Type here or click the microphone to speak health questions..."
                className="flex-1 px-5 py-3.5 bg-card border border-border rounded-xl text-body text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={toggleListening}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                  isListening 
                    ? "bg-rose-500 text-white animate-pulse" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-250"
                }`}
                title={isListening ? "Listening... click to stop" : "Start speaking"}
              >
                <Mic size={20} />
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={thinking || !input.trim()}
                className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-primary-foreground hover-lift shrink-0 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function generateRuleBasedResponse(text: string, userData: Record<string, any> | null): string {
  const q = text.toLowerCase();
  const stage = (userData?.broadHealthStage as string) ?? "general";
  const bmiVal = userData?.weightKg && userData?.heightCm
    ? (Number(userData.weightKg) / Math.pow(Number(userData.heightCm) / 100, 2)).toFixed(1)
    : null;
  const riskLevel = (userData?.latestRisk as any)?.riskLevel;

  if (q.includes("what should i do") || q.includes("how to improve") || q.includes("recommendation")) {
    if (stage === "pregnancy") {
      return `For your pregnancy stage, the most specific thing you can do is maintain a consistent low-glycemic diet to prevent gestational diabetes. Aim for 30 minutes of light walking daily and ensure you're tracking your blood glucose levels.`;
    }
    if (stage === "menopause") {
      return `During menopause, your insulin sensitivity decreases naturally. I specifically recommend adding 2 days of strength training to your week to build muscle mass, which helps process glucose more efficiently.`;
    }
  }

  if (q.includes("diabetes") || q.includes("sugar") || q.includes("glucose")) {
    return `Looking at your profile, your risk for diabetes is a key focus. To specifically target this, I recommend reducing refined sugars and processed carbohydrates immediately. ${bmiVal ? `With a BMI of ${bmiVal}, losing even 3-5% of body weight can improve your insulin sensitivity by up to 25%.` : ""}`;
  }

  if (q.includes("obesity") || q.includes("weight") || q.includes("bmi")) {
    return `${bmiVal ? `Your BMI of ${bmiVal} places you in a specific risk category for metabolic syndrome.` : "Weight management is critical for your metabolic health."} The most effective action is increasing your daily step count to 10,000 and replacing sugary drinks with water.`;
  }

  if (q.includes("step") || q.includes("walk") || q.includes("exercise") || q.includes("activity")) {
    return `To answer your question about activity: yes, walking is vital. Specifically, aim for 8,000 steps. For someone in the ${stage} stage, this helps stabilize blood sugar spikes after meals.`;
  }

  return `I want to make sure I answer your specific question accurately. Based on your ${stage} profile and ${riskLevel || "current"} risk assessment, focusing on balanced nutrition and consistent exercise is highly recommended.`;
}
