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
1. YOU MUST ANSWER THE USER'S QUESTION DIRECTLY AND SPECIFICALLY. Do not give vague or generic advice.
2. USE THE DATA: Always incorporate the user's BMI, stage, or risk level in your explanation.
3. Be highly empathetic but medically rigorous.
4. Keep responses concise (2-3 short paragraphs max).
5. If the question is not about women's metabolic health, politely redirect them back to their health profile.`;
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
      let responseText = "";

      // 1. Try backend API first (Secure & Robust)
      try {
        const response = await fetch("http://localhost:5001/chat", {
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
            console.log("Success using backend API");
          }
        } else {
          console.warn("Backend API failed, trying direct Gemini fallback...");
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
            const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];
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
        console.warn("Falling back to rule-based responses.");
        responseText = generateRuleBasedResponse(text, userData);
      }

      setMessages((prev) => [...prev, { role: "assistant", text: responseText }]);
    } catch (err: any) {
      console.error("Final catch in sendMessage:", err);
      import("sonner").then(({ toast }) => {
        toast.error(`Chat Error: ${err.message || "Unknown error"}`);
      });
      setMessages((prev) => [...prev, { role: "assistant", text: generateRuleBasedResponse(text, userData) }]);
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

  // Specific detection for questions about "what should I do" or "how to improve"
  if (q.includes("what should i do") || q.includes("how to improve") || q.includes("recommendation") || q.includes("advice")) {
    if (stage === "pregnancy") {
      return `For your pregnancy stage, the most specific thing you can do is maintain a consistent low-glycemic diet to prevent gestational diabetes. Aim for 30 minutes of light walking daily and ensure you're tracking your blood glucose levels if your risk is ${riskLevel || "not yet assessed"}. This directly helps regulate insulin during metabolic shifts.`;
    }
    if (stage === "menopause") {
      return `During menopause, your insulin sensitivity decreases naturally. I specifically recommend adding 2 days of strength training to your week to build muscle mass, which helps process glucose more efficiently. Also, focus on high-fiber foods to manage weight changes associated with falling estrogen levels.`;
    }
  }

  if (q.includes("diabetes") || q.includes("sugar") || q.includes("glucose")) {
    return `Looking at your profile, your ${riskLevel || "current"} risk for diabetes is a key focus. To specifically target this, I recommend reducing refined sugars and processed carbohydrates immediately. ${bmiVal ? `With a BMI of ${bmiVal}, losing even 3-5% of body weight can improve your insulin sensitivity by up to 25%.` : ""} Would you like a specific meal plan suggestion for today?`;
  }

  if (q.includes("obesity") || q.includes("weight") || q.includes("bmi")) {
    return `${bmiVal ? `Your BMI of ${bmiVal} places you in a specific risk category for metabolic syndrome.` : "Weight management is critical for your metabolic health."} The most effective direct action is increasing your daily step count to 10,000 and replacing sugary drinks with water. This has a 1:1 impact on reducing visceral fat, which is the primary driver of diabetes risk in our models.`;
  }

  if (q.includes("step") || q.includes("walk") || q.includes("exercise") || q.includes("activity")) {
    return `To answer your question about activity: yes, walking is vital. Specifically, aim for 7,000+ steps. For someone in the ${stage} stage, this helps stabilize blood sugar spikes after meals. Try to walk for 10-15 minutes after every large meal for the best metabolic results.`;
  }

  if (q.includes("sleep")) {
    return `Specific sleep advice for you: aim for 7.5 hours. Poor sleep directly spikes your cortisol, which makes your body store fat and resist insulin. If you're in ${stage}, hormone changes might be disrupting sleep—try a cool room and no blue light 1 hour before bed to protect your metabolic health.`;
  }

  return `I want to make sure I answer your specific question accurately. Based on your ${stage} profile and ${riskLevel || "current"} risk assessment, the most important thing is to focus on ${q.includes('diet') ? 'low-glycemic nutrition' : q.includes('exercise') ? 'post-meal walking' : 'consistent health tracking'}. 

Could you tell me more about your specific concern regarding ${text.split(' ').slice(-3).join(' ')} so I can give you a more targeted answer?`;
}

export default AIChat;
