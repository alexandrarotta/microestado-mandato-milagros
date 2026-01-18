import type { ReactNode } from "react";

interface PanelCardProps {
  children: ReactNode;
  className?: string;
}

export default function PanelCard({ children, className }: PanelCardProps) {
  return (
    <div
      className={`rounded-2xl bg-white/70 p-5 shadow-soft border border-white/60 ${
        className ?? ""
      }`}
    >
      {children}
    </div>
  );
}
