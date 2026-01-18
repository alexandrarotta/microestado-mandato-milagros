import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useGameStore } from "./store/gameStore";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OnboardingCountry from "./pages/OnboardingCountry";
import OnboardingLeader from "./pages/OnboardingLeader";
import OnboardingPreset from "./pages/OnboardingPreset";
import Game from "./pages/Game";
import Profile from "./pages/Profile";
import LevelComplete from "./pages/LevelComplete";
import Level2 from "./pages/Level2";
import GameOver from "./pages/GameOver";

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useGameStore((state) => state.token);
  const authStatus = useGameStore((state) => state.authStatus);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/70 shadow-soft rounded-2xl px-8 py-6 text-center">
          <p className="font-display text-2xl">Cargando sesion...</p>
        </div>
      </div>
    );
  }
  return children;
}

export default function App() {
  const loadConfig = useGameStore((state) => state.loadConfig);
  const configStatus = useGameStore((state) => state.configStatus);
  const configError = useGameStore((state) => state.configError);
  const hydrateAuth = useGameStore((state) => state.hydrateAuth);
  const token = useGameStore((state) => state.token);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth, token]);

  if (configStatus === "loading" || configStatus === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/70 shadow-soft rounded-2xl px-8 py-6 text-center">
          <p className="font-display text-2xl">Cargando microestado...</p>
        </div>
      </div>
    );
  }

  if (configStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/70 shadow-soft rounded-2xl px-8 py-6 text-center">
          <p className="font-display text-2xl">Error de configuracion</p>
          <p className="mt-2 text-sm text-ink/60">
            {configError ?? "No se pudo cargar la configuracion."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/onboarding/country"
        element={
          <RequireAuth>
            <OnboardingCountry />
          </RequireAuth>
        }
      />
      <Route
        path="/onboarding/leader"
        element={
          <RequireAuth>
            <OnboardingLeader />
          </RequireAuth>
        }
      />
      <Route
        path="/onboarding/preset"
        element={
          <RequireAuth>
            <OnboardingPreset />
          </RequireAuth>
        }
      />
      <Route
        path="/game"
        element={
          <RequireAuth>
            <Game />
          </RequireAuth>
        }
      />
      <Route
        path="/level-complete"
        element={
          <RequireAuth>
            <LevelComplete />
          </RequireAuth>
        }
      />
      <Route
        path="/level2"
        element={
          <RequireAuth>
            <Level2 />
          </RequireAuth>
        }
      />
      <Route
        path="/game-over"
        element={
          <RequireAuth>
            <GameOver />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
