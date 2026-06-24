import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import HealthTracker from "./pages/HealthTracker";
import AIChat from "./pages/AIChat";
import MonthlyWrap from "./pages/MonthlyWrap";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { useEffect, useState } from "react";
import { 
  auth, 
  db,
  onAuthStateChanged,
  doc,
  getDoc
} from "./lib/firebase";
import { Toaster } from "sonner";

const queryClient = new QueryClient();

/**
 * SmartSignupRedirect: When a logged-in user hits /signup (e.g. via "Get Started"),
 * check if they already completed onboarding and redirect accordingly.
 * This prevents the blank-page issue where onboarding crashes trying to re-check.
 */
const SmartSignupRedirect = () => {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const checkProfile = async () => {
      if (!auth?.currentUser || !db) {
        setTarget("/onboarding");
        return;
      }
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().onboardingCompleted) {
          setTarget("/dashboard");
        } else {
          setTarget("/onboarding");
        }
      } catch {
        // On error, default to onboarding
        setTarget("/onboarding");
      }
    };
    checkProfile();
  }, []);

  if (!target) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium">Redirecting...</p>
      </div>
    );
  }

  return <Navigate to={target} replace />;
};

const App = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!auth) {
      console.warn("Firebase not configured. Please add keys to .env");
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-muted-foreground font-medium">Loading...</p>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors />
      <ErrorBoundary>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/signup" element={user ? <SmartSignupRedirect /> : <Signup />} />
            <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/signup" />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/tracker" element={user ? <HealthTracker /> : <Navigate to="/login" />} />
            <Route path="/chat" element={user ? <AIChat /> : <Navigate to="/login" />} />
            <Route path="/monthly-wrap" element={user ? <MonthlyWrap /> : <Navigate to="/login" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
