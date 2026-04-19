/**
 * HerHealth — Firebase Firestore health data service.
 * All reads and writes for health logs, risk history, and user metrics
 * go through this module.
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MoodLog {
  date: string; // "YYYY-MM-DD"
  mood: string;
  note?: string;
  createdAt: string;
}

export interface SavedArticle {
  id: string;
  title: string;
  type: string;
  link: string;
  source: string;
  savedAt: string;
}

export interface DailyHealthLog {
  date: string;           // "YYYY-MM-DD"
  weightKg?: number;
  steps?: number;
  sleepHours?: number;
  waterLiters?: number;
  activityMinutes?: number;
  notes?: string;
  createdAt: string;      // ISO timestamp
}

export interface RiskRecord {
  riskLevel: "Low" | "Moderate" | "High";
  riskScore: number;
  bmi: number;
  modelUsed: string;
  insights: string[];
  createdAt: string;
}

// ─── Daily health logs ────────────────────────────────────────────────────────

/** Write one day's health data to Firestore. Returns the new document ID. */
export async function saveHealthLog(
  userId: string,
  log: Omit<DailyHealthLog, "createdAt">,
): Promise<string> {
  const ref = collection(db, "users", userId, "healthLogs");
  const snap = await addDoc(ref, { ...log, createdAt: new Date().toISOString() });
  return snap.id;
}

/** Fetch the most recent health logs for a user (newest first). */
export async function getHealthLogs(
  userId: string,
  maxLogs = 30,
): Promise<DailyHealthLog[]> {
  const ref = collection(db, "users", userId, "healthLogs");
  const q = query(ref, orderBy("date", "desc"), limit(maxLogs));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DailyHealthLog);
}

// ─── Risk prediction history ──────────────────────────────────────────────────

/** Persist one risk prediction result and update the user's denormalised latest risk. */
export async function saveRiskRecord(
  userId: string,
  record: Omit<RiskRecord, "createdAt">,
): Promise<void> {
  // Full history sub-collection
  const histRef = collection(db, "users", userId, "riskHistory");
  await addDoc(histRef, { ...record, createdAt: new Date().toISOString() });

  // Denormalised latest risk on the user document for fast dashboard reads
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      latestRisk: {
        riskLevel: record.riskLevel,
        riskScore: record.riskScore,
        bmi: record.bmi,
        updatedAt: new Date().toISOString(),
      },
    },
    { merge: true },
  );
}

/** Fetch the most recent risk predictions for a user (newest first). */
export async function getRiskHistory(
  userId: string,
  maxRecords = 10,
): Promise<RiskRecord[]> {
  const ref = collection(db, "users", userId, "riskHistory");
  const q = query(ref, orderBy("createdAt", "desc"), limit(maxRecords));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as RiskRecord);
}

/** Save a mood entry for the user. */
export async function saveMoodLog(
  userId: string,
  mood: string,
  note: string = ""
): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const ref = doc(db, "users", userId, "moodLogs", date);
  await setDoc(ref, {
    date,
    mood,
    note,
    createdAt: new Date().toISOString()
  });
}

/** Fetch all mood logs. */
export async function getMoodLogs(userId: string): Promise<MoodLog[]> {
  const ref = collection(db, "users", userId, "moodLogs");
  const snap = await getDocs(ref);
  return snap.docs.map(d => d.data() as MoodLog);
}

/** Save an article to the user's favorites. */
export async function saveArticle(
  userId: string,
  article: Omit<SavedArticle, "id" | "savedAt">
): Promise<string> {
  const ref = collection(db, "users", userId, "savedArticles");
  const snap = await addDoc(ref, {
    ...article,
    savedAt: new Date().toISOString()
  });
  return snap.id;
}

/** Fetch all saved articles. */
export async function getSavedArticles(userId: string): Promise<SavedArticle[]> {
  const ref = collection(db, "users", userId, "savedArticles");
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedArticle));
}

/** Remove a saved article. */
export async function removeArticle(userId: string, articleId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "savedArticles", articleId));
}

// ─── User metric summaries ────────────────────────────────────────────────────

/** Merge updated computed metrics (e.g. healthScore, bmi) into the user document. */
export async function updateUserMetrics(
  userId: string,
  metrics: Partial<{
    healthScore: number;
    weightKg: number;
    bmi: number;
    lastLogDate: string;
  }>,
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    { ...metrics, metricsUpdatedAt: new Date().toISOString() },
    { merge: true },
  );
}
