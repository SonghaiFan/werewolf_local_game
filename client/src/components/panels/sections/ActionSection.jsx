import React from "react";
import { PanelSection, PanelActions, PanelProcessControl } from "../BasePanel";

export function ActionSection({
  t,
  title,
  role,
  availableActions = [],
  onAction,
}) {
  const mainActions = availableActions.filter((a) => a.type !== "skip");
  const skipAction = availableActions.find((a) => a.type === "skip");

  return (
    <PanelSection
      title={title || t(`${role?.toLowerCase()}_wake`, t("identity"))}
      className="space-y-3"
    >
      <PanelActions>
        {mainActions.map((action) => (
          <button
            key={action.type}
            className={`btn-base px-4 py-3 rounded-[var(--radius-lg)] font-medium text-sm transition-all 
                                ${
                                  action.disabled
                                    ? "bg-zinc-800 text-zinc-500 border-zinc-700/30 cursor-not-allowed shadow-none opacity-50"
                                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white"
                                } ${
              mainActions.length === 1 ? "col-span-2" : ""
            }`}
            onClick={() => {
              if (!action.disabled) {
                onAction(action.type, action.needsTarget);
              } else if (action.disabledReason) {
                alert(t(action.disabledReason));
              }
            }}
          >
            {t(action.label)}{" "}
            {action.disabled ? `(${t("consumed", "Consumed")})` : ""}
          </button>
        ))}
      </PanelActions>
      {skipAction && (
        <PanelProcessControl>
          <button
            className="btn-outline w-full py-2 text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
            onClick={() => onAction("skip", false)}
          >
            {t("skip")}
          </button>
        </PanelProcessControl>
      )}
    </PanelSection>
  );
}
