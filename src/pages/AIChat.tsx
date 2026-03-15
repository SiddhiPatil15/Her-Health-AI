import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Loader2 } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const suggestedPrompts = [
  "How can I reduce my metabolic risk?",
  "What diet helps during menopause?",
  "Best exercises for my health stage?",
  "How to improve my sleep quality?",
];

interface Message {
  role: "user" | "assistant";
  text: string;
}

  // The generateResponse function has been completely removed as we now use the ML Backend for dynamic reasoning.

const AIChat = () => {
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load user profile for context-aware responses
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        const firstName = (data.fullName as string | undefined)?.split(" ")[0] ?? "there";
        setMessages([
          {
            role: "assistant",
            text: `Hi ${firstName}! I'm your AI health companion. Ask me anything about your metabolic health, lifestyle, or wellness journey. 💕`,
          },
        ]);
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
      const API_BASE = (import.meta.env.VITE_ML_API_URL as string | undefined) ?? "http://localhost:5001";
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, userData })
      });
      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.response ?? "Hmm, I couldn't process that right now." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "I'm having trouble connecting to my brain right now. Please try again later." },
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
              <p className="text-caption text-muted-foreground">Powered by your personalised health profile</p>
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
                  className={`max-w-[72%] rounded-2xl px-5 py-3.5 ${
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
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-5 py-3.5 card-shadow flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <p className="text-body text-muted-foreground">Thinking…</p>
                </div>
              </div>
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
                  className="px-4 py-2 bg-card border border-border rounded-xl text-caption text-foreground hover:border-primary/30 hover-lift transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Ask about your health…"
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
        </main>
      </div>
    </div>
  );
};

export default AIChat;

