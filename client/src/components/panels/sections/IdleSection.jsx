import React from "react";
import { PanelSection, PanelInfo } from "../BasePanel";

export function IdleSection({
  title,
  content,
  children,
  animate = false,
  className = "",
}) {
  return (
    <PanelSection className={className}>
      <PanelInfo>
        {title && (
          <div className="font-mono text-[10px] mb-2 text-muted opacity-60 uppercase tracking-[0.2em]">
            {title}
          </div>
        )}

        {content && (
          <p
            className={`text-sm font-medium ${
              animate ? "text-ink/90 animate-pulse" : "text-muted italic"
            }`}
          >
            {content}
          </p>
        )}

        {children}
      </PanelInfo>
    </PanelSection>
  );
}
