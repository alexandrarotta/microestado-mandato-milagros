import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth";
import { useGameStore } from "../store/gameStore";

export default function Register() {
  const navigate = useNavigate();
  const setToken = useGameStore((state) => state.setToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await registerUser({
        email,
        password
      });
      setToken(response.token);
      navigate("/onboarding/country");
    } catch (err) {
      setError("No se pudo registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-glow">
        <h1 className="font-display text-3xl">Crear cuenta</h1>
        <p className="mt-2 text-sm text-ink/60">
          Abre el archivo del microestado y ponle un sello.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-ink/60">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-2"
            />
          </div>
          {error ? <p className="text-sm text-ember">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white"
          >
            {loading ? "Creando..." : "Crear"}
          </button>
        </form>
        <p className="mt-4 text-sm text-ink/60">
          Ya tienes cuenta?{" "}
          <Link className="text-ocean underline" to="/login">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
