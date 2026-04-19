import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Heart, ArrowRight, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const questions = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead or of hurting yourself in some way",
];

const options = [
  { text: "Not at all", score: 0 },
  { text: "Several days", score: 1 },
  { text: "More than half the days", score: 2 },
  { text: "Nearly every day", score: 3 },
];

export default function PHQ9Screening({ userData }: { userData: any }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(9).fill(-1));
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<{ score: number; response: string; severity: string } | null>(null);

  const handleSelect = (score: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = score;
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    }
  };

  const handleSubmit = async () => {
    if (answers.includes(-1)) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    setIsEvaluating(true);
    const score = answers.reduce((a, b) => a + b, 0);

    try {
      let mlApiUrl = import.meta.env.VITE_ML_API_URL ?? "http://localhost:5001";
      if (mlApiUrl.endsWith('/')) {
        mlApiUrl = mlApiUrl.slice(0, -1);
      }
      const response = await fetch(`${mlApiUrl}/phq9-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          stage: userData?.broadHealthStage || "postpartum",
        }),
      });

      let aiResponseText = "";
      let severityLevel = "";

      if (response.ok) {
        const data = await response.json();
        aiResponseText = data.response;
        severityLevel = data.severity;
      } else {
        throw new Error("Evaluation failed");
      }

      const evalResult = { score, response: aiResponseText, severity: severityLevel };
      setResult(evalResult);

      // Save to Firebase securely
      const user = auth.currentUser;
      if (user) {
        await addDoc(collection(db, "users", user.uid, "phq9Screenings"), {
          score,
          severity: severityLevel,
          aiResponse: aiResponseText,
          answers,
          date: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not reach evaluation service. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetScreening = () => {
    setAnswers(Array(9).fill(-1));
    setCurrentQuestion(0);
    setResult(null);
  };

  if (result) {
    const isHighConcern = result.score >= 15;
    
    return (
      <div className="max-w-3xl mx-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 border border-[#F3F4F6] shadow-sm"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isHighConcern ? 'bg-rose-100 text-rose-500' : 'bg-emerald-100 text-emerald-500'}`}>
              {isHighConcern ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Screening Complete</h2>
              <p className="text-gray-500">Your score: {result.score}/27</p>
            </div>
          </div>

          <div className={`p-6 rounded-2xl mb-8 ${isHighConcern ? 'bg-rose-50/50 border border-rose-100' : 'bg-gray-50 border border-gray-100'}`}>
            <h3 className="font-semibold text-lg text-gray-900 mb-2">Evaluation: {result.severity}</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.response}</p>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={resetScreening}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors px-4 py-2"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Screening
            </button>
            <button
              onClick={() => window.location.hash = '#/dashboard'}
              className="gradient-primary text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const answeredCount = answers.filter(a => a !== -1).length;
  const progress = (answeredCount / 9) * 100;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Brain className="w-8 h-8 text-[#FF758C]" />
          Postpartum Mental Health Screening
        </h2>
        <p className="text-gray-500">Over the last 2 weeks, how often have you been bothered by any of the following problems?</p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-[#F3F4F6] shadow-sm relative overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
          <div 
            className="h-full gradient-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center mb-8 pt-2">
          <span className="text-sm font-semibold text-[#FF758C]">Question {currentQuestion + 1} of 9</span>
          <span className="text-sm text-gray-400">{answeredCount} answered</span>
        </div>

        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-xl font-medium text-gray-800 mb-8 min-h-[60px]">
            {questions[currentQuestion]}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt) => (
              <button
                key={opt.score}
                onClick={() => handleSelect(opt.score)}
                className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group ${
                  answers[currentQuestion] === opt.score
                    ? 'border-[#FF758C] bg-rose-50'
                    : 'border-[#F3F4F6] hover:border-rose-200 hover:bg-rose-50/50'
                }`}
              >
                <span className={`font-medium ${answers[currentQuestion] === opt.score ? 'text-[#FF758C]' : 'text-gray-700 group-hover:text-gray-900'}`}>
                  {opt.text}
                </span>
                {answers[currentQuestion] === opt.score && (
                  <CheckCircle2 className="w-5 h-5 text-[#FF758C]" />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="mt-10 flex justify-between items-center pt-6 border-t border-gray-100">
          <button
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-2.5 rounded-full font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          
          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={answers.includes(-1) || isEvaluating}
              className="gradient-primary text-white px-8 py-2.5 rounded-full font-semibold hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isEvaluating ? "Evaluating..." : "Submit Screening"}
              {!isEvaluating && <ArrowRight className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
              className="bg-gray-900 text-white px-8 py-2.5 rounded-full font-semibold hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
