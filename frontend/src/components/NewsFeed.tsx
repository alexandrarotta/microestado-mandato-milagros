import type { NewsItem } from "../types";

interface NewsFeedProps {
  items: NewsItem[];
  startableProjects?: { id: string; name: string }[];
  onJumpToProjects?: () => void;
}

function formatRelativeTime(timestamp: number) {
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (deltaSeconds < 60) return `hace ${deltaSeconds}s`;
  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function getTag(type?: NewsItem["type"]) {
  switch (type) {
    case "PROJECT_UNLOCK":
      return "DESBLOQUEADO";
    case "PROJECT_READY":
      return "LISTO";
    case "PROJECT":
      return "PROYECTO";
    case "EVENT":
      return "EVENTO";
    default:
      return "SISTEMA";
  }
}

export default function NewsFeed({
  items,
  startableProjects = [],
  onJumpToProjects
}: NewsFeedProps) {
  return (
    <div className="rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60">
      <h3 className="font-display text-xl">Noticias</h3>
      {startableProjects.length > 0 ? (
        <div className="mt-4 rounded-xl border border-ember/40 bg-ember/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-ember">
              Proyectos listos ({startableProjects.length})
            </p>
            {onJumpToProjects ? (
              <button
                type="button"
                onClick={onJumpToProjects}
                className="rounded-full border border-ember/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ember"
              >
                Ir a proyectos
              </button>
            ) : null}
          </div>
          <ul className="mt-2 space-y-1 text-sm text-ember">
            {startableProjects.map((project) => (
              <li key={project.id} className="flex items-start gap-2">
                <span>•</span>
                <span>{project.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-4 space-y-3 max-h-[200px] overflow-auto pr-2">
        {items.length === 0 ? (
          <p className="text-sm text-ink/60">Sin titulares aun.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 ${
                item.type === "PROJECT_UNLOCK" ||
                item.type === "PROJECT_READY" ||
                item.severity === "CRITICAL"
                  ? "border-ember/40 bg-ember/10 text-ember"
                  : "border-white/60 bg-white/70 text-ink"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em]">
                <span>{getTag(item.type)}</span>
                <span className="text-ink/50">{formatRelativeTime(item.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm">{item.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
