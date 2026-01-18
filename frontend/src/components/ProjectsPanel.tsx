import type { GameSave, ProjectConfig } from "../types";
import { formatPct } from "../utils/formatPct";

interface ProjectsPanelProps {
  projects: ProjectConfig[];
  state: GameSave;
  getCost: (project: ProjectConfig) => number;
  speedCost: number;
  onStart: (projectId: string) => void;
  onSpeed: (projectId: string) => void;
  disabled?: boolean;
}

function statusLabel(status: string) {
  switch (status) {
    case "available":
      return "Disponible";
    case "in_progress":
      return "En curso";
    case "paused":
      return "Bloqueado por coalicion";
    case "completed":
      return "Completado";
    default:
      return "Bloqueado";
  }
}

export default function ProjectsPanel({
  projects,
  state,
  getCost,
  speedCost,
  onStart,
  onSpeed,
  disabled = false
}: ProjectsPanelProps) {
  const availableProjects = projects.filter(
    (project) => state.projects[project.id]?.status === "available"
  );
  const minAvailableCost = availableProjects.length
    ? Math.min(...availableProjects.map((project) => getCost(project)))
    : null;
  const showTreasuryWarning =
    minAvailableCost !== null && state.treasury < minAvailableCost;

  return (
    <div className="rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl">Proyectos</h3>
        <span className="text-xs text-ink/60">Fase {state.phase}</span>
      </div>
      {showTreasuryWarning ? (
        <div className="mt-3 rounded-xl border border-ember/30 bg-ember/10 px-3 py-2 text-xs text-ink/70">
          Necesitas Tesoro para iniciar proyectos. Ajusta impuestos, elige una
          industria o espera recaudacion.
        </div>
      ) : null}
      <div className="mt-4 space-y-3 max-h-[420px] overflow-auto pr-2">
        {projects.map((project) => {
          const projectState = state.projects[project.id];
          if (!projectState) return null;
          const cost = getCost(project);
          const adminCost = project.adminCost ?? 0;
          const progressPct = Math.min(
            100,
            Math.round((projectState.progress / project.durationTicks) * 100)
          );
          const canStart =
            projectState.status === "available" &&
            !disabled &&
            state.treasury >= cost &&
            (adminCost <= 0 || (state.adminUnlocked && state.admin >= adminCost));
          const canSpeed =
            projectState.status === "in_progress" &&
            !disabled &&
            state.premiumTokens >= speedCost;
          let disabledReason = "";
          if (disabled) {
            disabledReason = "Modo lectura activo.";
          } else if (projectState.status !== "available") {
            disabledReason =
              projectState.status === "locked"
                ? "Requisitos no cumplidos"
                : projectState.status === "paused"
                ? "Bloqueado por coalicion"
                : "Proyecto no disponible";
          } else if (state.treasury < cost) {
            disabledReason = `Fondos insuficientes: necesitas ${cost}, tienes ${Math.round(
              state.treasury
            )}`;
          } else if (adminCost > 0 && !state.adminUnlocked) {
            disabledReason =
              "Necesitas Admin (Capacidad estatal). Desbloquea Instituciones (Fase 2).";
          } else if (adminCost > 0 && state.admin < adminCost) {
            disabledReason = `Admin insuficiente: necesitas ${adminCost}, tienes ${Math.round(
              state.admin
            )}`;
          }

          return (
            <div
              key={project.id}
              className="rounded-xl border border-ink/10 bg-white/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{project.name}</p>
                  <p className="text-xs text-ink/60">{project.description}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-ocean/70">
                  {statusLabel(projectState.status)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-ink/60">
                <span>Costo: {cost}</span>
                <span>Fase {project.phase}</span>
              </div>
              {adminCost > 0 ? (
                <div className="mt-1 text-xs text-ink/50">
                  Admin requerido: {adminCost} · Disponible: {Math.round(state.admin)}
                </div>
              ) : null}
              <div className="mt-2">
                <div className="h-2 w-full rounded-full bg-ink/10">
                  <div
                    className="h-2 rounded-full bg-ocean"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-ink/60">{formatPct(progressPct)}</span>
                <div className="flex items-center gap-2">
                  {projectState.status === "in_progress" ? (
                    <button
                      type="button"
                      onClick={() => onSpeed(project.id)}
                      disabled={!canSpeed}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        canSpeed
                          ? "bg-ocean text-white hover:bg-ocean/90"
                          : "bg-ink/10 text-ink/40"
                      }`}
                    >
                      Acelerar ({speedCost})
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onStart(project.id)}
                    disabled={!canStart}
                    title={!canStart ? disabledReason : undefined}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      canStart
                        ? "bg-ember text-white hover:bg-ember/90"
                        : "bg-ink/10 text-ink/40"
                    }`}
                  >
                    Iniciar
                  </button>
                </div>
              </div>
              {!canStart && disabledReason ? (
                <p className="mt-2 text-[11px] text-ink/50">{disabledReason}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
