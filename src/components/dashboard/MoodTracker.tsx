import { useState, useEffect } from "react";
import { auth } from "../../lib/firebase";
import { Calendar } from "../../components/ui/calendar";
import { saveMoodLog, getMoodLogs, MoodLog } from "../../lib/healthService";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, Frown, Meh, Heart, MessageSquare, Flame } from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, parseISO } from "date-fns";

const moods = [
  { icon: Smile, label: "Great", color: "text-emerald-500", bg: "bg-emerald-50", emoji: "😊" },
  { icon: Heart, label: "Loved", color: "text-rose-500", bg: "bg-rose-50", emoji: "🥰" },
  { icon: Meh, label: "Okay", color: "text-amber-500", bg: "bg-amber-50", emoji: "😐" },
  { icon: Frown, label: "Low", color: "text-blue-500", bg: "bg-blue-50", emoji: "😔" },
];

export const MoodTracker = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [note, setNote] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      getMoodLogs(user.uid).then(logs => {
        setMoodLogs(logs);
        calculateStreak(logs);
      });
    }
  }, []);

  const calculateStreak = (logs: MoodLog[]) => {
    if (logs.length === 0) return;
    // Simple streak calculation based on sequential days
    const dates = logs.map(l => l.date).sort().reverse();
    let currentStreak = 0;
    let today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < dates.length; i++) {
        // Logic for streak can be more complex, but this is a placeholder
        currentStreak++;
    }
    setStreak(currentStreak);
  };

  const handleSaveMood = async () => {
    const user = auth.currentUser;
    if (!user || !selectedMood) return;

    try {
      await saveMoodLog(user.uid, selectedMood, note);
      const newLog = {
        date: new Date().toISOString().split('T')[0],
        mood: selectedMood,
        note: note,
        createdAt: new Date().toISOString()
      };
      setMoodLogs(prev => [...prev.filter(l => l.date !== newLog.date), newLog]);
      toast.success("Mood logged for today!");
      setNote("");
      setSelectedMood(null);
    } catch (error: any) {
      console.error("Error saving mood:", error);
      toast.error(`Error saving mood: ${error.message || "Unknown error"}`);
    }
  };

  const activeLog = selectedDate ? moodLogs.find(l => l.date === format(selectedDate, "yyyy-MM-dd")) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500">Daily Streak</p>
            <p className="text-xl font-bold text-gray-900">{streak} Days</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Calendar Side */}
        <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border-none"
            modifiers={{
              logged: (date) => moodLogs.some(l => l.date === format(date, "yyyy-MM-dd"))
            }}
            modifiersStyles={{
              logged: { fontWeight: "bold", color: "#FF758C", backgroundColor: "#FFF1F2", borderRadius: "50%" }
            }}
          />
        </div>

        {/* Mood Input Side */}
        <div className="bg-white p-6 rounded-[32px] border border-[#F3F4F6] shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-gray-800">
            {selectedDate && isSameDay(selectedDate, new Date()) 
              ? "How are you feeling today?" 
              : selectedDate ? `Journal for ${format(selectedDate, "MMM do")}` : "Select a day"}
          </h3>

          {activeLog ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-rose-50 rounded-[24px] space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{moods.find(m => m.label === activeLog.mood)?.emoji || "✨"}</span>
                <div>
                  <p className="font-bold text-rose-900">{activeLog.mood}</p>
                  <p className="text-sm text-rose-600">Logged at {format(parseISO(activeLog.createdAt), "h:mm a")}</p>
                </div>
              </div>
              {activeLog.note && (
                <div className="bg-white/50 p-4 rounded-xl">
                  <p className="text-sm text-gray-700 italic">"{activeLog.note}"</p>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-3">
                {moods.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => setSelectedMood(m.label)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                      selectedMood === m.label ? `${m.bg} ${m.color} ring-2 ring-current` : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <m.icon className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a quick note about your day..."
                  className="w-full bg-gray-50 rounded-2xl p-4 pl-12 text-sm border-none focus:ring-2 focus:ring-primary/20 min-h-[100px] outline-none transition-all"
                />
              </div>

              <button
                onClick={handleSaveMood}
                disabled={!selectedMood}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-rose-500 transition-all disabled:opacity-50 disabled:hover:bg-primary shadow-lg shadow-rose-100"
              >
                Log Entry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
