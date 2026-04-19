import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Loader2 } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

// Build a personalized system prompt from user data
function buildSystemPrompt(userData: Record<string, unknown>): string {
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
1. YOU MUST ANSWER THE USER'S QUESTION DIRECTLY AND SPECIFICALLY. Do not just give generic advice. If they ask a specific question, answer that exact question.
2. Personalize your answer based heavily on the USER HEALTH PROFILE provided above.
3. Be highly empathetic but medically rigorous.
4. Keep responses concise (2-3 short paragraphs max).
5. Do not use excessive markdown.`;
}

const AIChat = () => {
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        setUserData(data);
        const firstName = (data.fullName as string | undefined)?.split(" ")[0] ?? "there";
        const riskLevel = (data.latestRisk as any)?.riskLevel;
        setMessages([
          {
            role: "assistant",
            text: `Hi ${firstName}! 👋 I'm your AI Health Companion, specialized in Diabetes, Obesity, and Metabolic Health.\n\n${
              riskLevel
                ? `Your current AI risk assessment shows **${riskLevel}** metabolic risk. I can help you understand what that means and how to improve it.`
                : "I can answer questions about your health profile, diabetes prevention, obesity risk, and much more!"
            }\n\nWhat would you like to know today? 💕`,
          },
        ]);
      } else {
        setMessages([{
          role: "assistant",
          text: "Hi there! 👋 I'm your AI Health Companion. Please complete your health profile (onboarding) so I can give you personalized advice on diabetes, obesity, and metabolic health. What would you like to know?",
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
      // Try backend first
      const API_BASE = (import.meta.env.VITE_ML_API_URL as string | undefined) ?? "http://localhost:5001";
      let responseText = "";

      try {
        const response = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, userData }),
          signal: AbortSignal.timeout(5000), // 5s timeout
        });
        if (response.ok) {
          const data = await response.json();
          responseText = data.response ?? "";
          if (responseText.includes("reasoning brain is currently disconnected")) {
            responseText = ""; // Trigger local fallback immediately
          }
        }
      } catch {
        // Backend offline — fallback to Gemini directly
      }

      // Fallback: use Gemini directly from frontend
      if (!responseText) {
        const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (geminiKey) {
          const genAI = new GoogleGenerativeAI(geminiKey);
          const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"];
          const systemPrompt = buildSystemPrompt(userData ?? {});
          
          for (const modelName of modelsToTry) {
            try {
              const model = genAI.getGenerativeModel({ model: modelName });
              const result = await model.generateContent(`${systemPrompt}\n\nUser asks: "${text}"`);
              responseText = result.response.text();
              if (responseText) {
                 console.log(`Successfully generated response using ${modelName}`);
                 break;
              }
            } catch (geminiErr: any) {
              console.warn(`Model ${modelName} failed (potentially rate limited):`, geminiErr);
              // Loop continues to the next available model
            }
          }
        }
      }

      if (!responseText) {
        responseText = generateRuleBasedResponse(text, userData);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: responseText },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: generateRuleBasedResponse(text, userData) },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-h2 text-foreground">AI Health Companion</h1>
              <p className="text-caption text-muted-foreground">
                Specialized in Diabetes, Obesity & Metabolic Health • Powered by your health profile
              </p>
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
                      ? "gradient-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground card-shadow"
                  }`}
                >
                  <p className="text-body leading-relaxed whitespace-pre-wrap">{msg.text}</p>
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
                  className="px-4 py-2 bg-card border border-border rounded-xl text-caption text-foreground hover:border-primary/30 hover-lift transition-all text-left"
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
                placeholder="Ask about diabetes risk, obesity, menopause, or your health profile…"
                className="flex-1 px-5 py-3.5 bg-card border border-border rounded-xl text-body text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
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
};

// Rule-based fallback responses about diabetes/obesity
function generateRuleBasedResponse(text: string, userData: Record<string, unknown> | null): string {
  const q = text.toLowerCase();
  const stage = (userData?.broadHealthStage as string) ?? "general";
  const bmiVal = userData?.weightKg && userData?.heightCm
    ? (Number(userData.weightKg) / Math.pow(Number(userData.heightCm) / 100, 2)).toFixed(1)
    : null;
  const riskLevel = (userData?.latestRisk as any)?.riskLevel;

  if (q.includes("diabetes") || q.includes("sugar") || q.includes("glucose")) {
    return `Based on your health profile${riskLevel ? ` (current risk: ${riskLevel})` : ""}, here's what you should know about diabetes:\n\nType 2 diabetes risk increases with high BMI, sedentary lifestyle, poor sleep, and family history. ${bmiVal ? `Your BMI of ${bmiVal} is a key factor in our model.` : ""} Reducing refined sugar, increasing fiber intake, and 150+ minutes of moderate activity per week can reduce risk by up to 30%.\n\n${stage === "pregnancy" ? "Since you're in your pregnancy stage, gestational diabetes is particularly important to monitor. Regular glucose screening and maintaining healthy weight gain are critical." : stage === "menopause" ? "During menopause, falling estrogen levels increase insulin resistance — making diet and activity even more important for diabetes prevention." : ""}`;
  }

  if (q.includes("obesity") || q.includes("weight") || q.includes("bmi")) {
    return `${bmiVal ? `Your current BMI of ${bmiVal} has been factored into your risk score.` : "BMI is one of the most important factors in our obesity and diabetes prediction models."}\n\nObesity increases risk of Type 2 diabetes, heart disease, and metabolic syndrome. Our Obesity Prediction model analyzes your BMI, activity level, diet, and sleep patterns together to assess your risk.\n\nKey strategies: increase daily steps to 10,000+, choose whole foods over processed ones, and ensure 7-8 hours of quality sleep nightly.`;
  }

  if (q.includes("step") || q.includes("walk") || q.includes("exercise") || q.includes("activity")) {
    return `Walking is one of the most effective ways to reduce diabetes and obesity risk! Health recommendations suggest:\n\n• 7,000–10,000 steps/day for metabolic health\n• 150 min/week of moderate activity reduces Type 2 diabetes risk by 30%\n• Just 30 min of brisk walking daily can significantly improve insulin sensitivity\n\nUse the HerHealth Tracker's built-in pedometer to count steps automatically. Your steps are saved to your profile and tracked in the Monthly Wrap!`;
  }

  if (q.includes("sleep")) {
    return `Sleep quality is strongly linked to metabolic health. Studies show that less than 6 hours of sleep increases obesity risk by 34% and raises cortisol levels, which disrupts insulin regulation.\n\nAim for 7–9 hours of consistent sleep. ${userData?.sleepHours ? `Your logged sleep of ${userData.sleepHours} hrs/night factors into your risk score.` : ""} Try keeping a consistent sleep schedule and limiting screens 1 hour before bed for better sleep quality.`;
  }

  if (q.includes("menopause")) {
    return `During menopause, declining estrogen levels cause major metabolic shifts including increased abdominal fat, reduced insulin sensitivity, and higher cardiovascular risk.\n\nHerHealth's risk models are specifically calibrated for menopausal women. Key recommendations: prioritize strength training (builds insulin-sensitive muscle), follow a low-glycemic diet, monitor blood pressure, and log metrics daily to track changes over time.`;
  }

  if (q.includes("pregnancy") || q.includes("gestational")) {
    return `Gestational diabetes affects approximately 10% of pregnancies and significantly increases future Type 2 diabetes risk for both mother and child.\n\nOur Gestational Diabetes prediction model considers your BMI, age, family history, and activity level. Risk factors include BMI >27, age >30, and family history of diabetes.\n\nManagement strategies: low-GI diet, 30 min of light activity daily, regular glucose monitoring, and consistent prenatal care.`;
  }

  return `Great question! Based on your health profile${stage !== "general" ? ` (${stage} stage)` : ""}${riskLevel ? ` with a ${riskLevel} risk assessment` : ""}, I recommend focusing on these core metabolic health pillars:\n\n1. **Activity**: 7,000+ steps/day, 150 min/week moderate exercise\n2. **Diet**: Low-glycemic foods, reduce sugar and processed carbs\n3. **Sleep**: 7–8 hours consistently\n4. **Monitoring**: Regular weight, blood pressure, and glucose tracking\n\nWould you like specific advice on any of these areas?`;
}

export default AIChat;
