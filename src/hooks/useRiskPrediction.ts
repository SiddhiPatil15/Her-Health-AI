/**
 * useRiskPrediction — React hook that calls the ML prediction API
 * and persists the result to Firestore.
 */

import { useCallback, useState } from "react";
import { auth } from "@/lib/firebase";
import { getPrediction, PredictionInput, PredictionResult } from "@/lib/api";
import { saveRiskRecord } from "@/lib/healthService";

interface UseRiskPredictionReturn {
  prediction: PredictionResult | null;
  loading: boolean;
  error: string | null;
  run: (input: PredictionInput) => Promise<void>;
}

export function useRiskPrediction(): UseRiskPredictionReturn {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (input: PredictionInput) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getPrediction(input);
      setPrediction(result);

      // Persist to Firestore (fire-and-forget — UI doesn't need to wait)
      const user = auth.currentUser;
      if (user) {
        saveRiskRecord(user.uid, {
          riskLevel: result.riskLevel,
          riskScore: result.riskScore,
          bmi: result.bmi,
          modelUsed: result.modelUsed,
          insights: result.insights,
        }).catch((err) => console.warn("Could not save risk record:", err));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Prediction failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { prediction, loading, error, run };
}
