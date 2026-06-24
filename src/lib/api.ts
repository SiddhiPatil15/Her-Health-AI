/**
 * HerHealth ML Prediction API client.
 * Calls the Flask prediction service running at VITE_ML_API_URL.
 */

export const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_ML_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:5001`;
};

export const API_BASE = getApiBase();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PredictionInput {
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: "sedentary" | "light" | "moderate" | "very";
  sleepHours: number;
  dietType: "balanced" | "vegetarian" | "vegan" | "keto";
  diabetesHistory: "no" | "family" | "gestational" | "type2";
  bloodPressure: "normal" | "elevated" | "high" | "low";
  broadHealthStage: "pregnancy" | "menopause" | "general";
}

export interface PredictionResult {
  riskLevel: "Low" | "Moderate" | "High";
  riskScore: number;       // 0–100
  confidence: number;      // 0–1
  insights: string[];
  bmi: number;
  modelUsed: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * POST /predict  — Run the ML risk assessment.
 * Throws an Error on network failure or non-OK HTTP status.
 */
export async function getPrediction(input: PredictionInput): Promise<PredictionResult> {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
  }

  return res.json() as Promise<PredictionResult>;
}

/**
 * GET /health  — Quick liveness probe.
 * Returns true if the service is reachable and healthy.
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(4_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
