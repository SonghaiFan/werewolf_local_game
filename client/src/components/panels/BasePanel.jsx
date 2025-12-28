import React from "react";

export default function BasePanel({ children, className = "" }) {
  return <div className={`flex flex-col h-full ${className}`}>{children}</div>;
}

export function PanelTitle({ children }) {
  return (
    <div className="text-[10px] text-muted/60 font-bold uppercase tracking-[0.2em] mb-2 text-center">
      {children}
    </div>
  );
}

export function PanelSection({ children, title, className = "" }) {
  return (
    <div className={`mt-auto w-full max-w-md mx-auto ${className}`}>
      {title && <PanelTitle>{title}</PanelTitle>}
      {children}
    </div>
  );
}

export function PanelInfo({ children, type = "default" }) {
  const styles = {
    default: "bg-surface/20 border-border/50 text-ink/90",
    danger: "bg-danger/10 border-danger/20 text-danger/80",
    primary: "bg-primary/10 border-primary/20 text-primary",
  };

  return (
    <div
      className={`p-4 rounded-[var(--radius-lg)] border backdrop-blur-sm text-center animate-in ${
        styles[type] || styles.default
      }`}
    >
      {children}
    </div>
  );
}

export function PanelActions({ children, className = "" }) {
  return (
    <div className={`grid grid-cols-2 gap-3 mt-4 ${className}`}>
      {children}
    </div>
  );
}

export function PanelProcessControl({ children, className = "" }) {
  return (
    <div className={`flex flex-col gap-2 mt-4 ${className}`}>
      {children}
    </div>
  );
}

export function DeadMessage({ t }) {
  return (
    <PanelSection>
      <button
        className="btn-secondary w-full opacity-50 cursor-not-allowed bg-transparent border-dashed"
        disabled
      >
        {t("you_are_dead")}
      </button>
    </PanelSection>
  );
}
